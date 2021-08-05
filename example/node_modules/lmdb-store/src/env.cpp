
// This file is part of node-lmdb, the Node.js binding for lmdb
// Copyright (c) 2013-2017 Timur Kristóf
// Copyright (c) 2021 Kristopher Tate
// Licensed to you under the terms of the MIT license
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

#include "node-lmdb.h"

using namespace v8;
using namespace node;

#define IGNORE_NOTFOUND    (1)
thread_local Nan::Persistent<Function>* EnvWrap::txnCtor;
thread_local Nan::Persistent<Function>* EnvWrap::dbiCtor;
//Nan::Persistent<Function> EnvWrap::txnCtor;
//Nan::Persistent<Function> EnvWrap::dbiCtor;
uv_mutex_t* EnvWrap::envsLock = EnvWrap::initMutex();
std::vector<env_path_t> EnvWrap::envs;

uv_mutex_t* EnvWrap::initMutex() {
    uv_mutex_t* mutex = new uv_mutex_t;
    uv_mutex_init(mutex);
    return mutex;
}

EnvWrap::EnvWrap() {
    this->env = nullptr;
    this->currentWriteTxn = nullptr;
    this->currentBatchTxn = nullptr;
	this->currentReadTxn = nullptr;
	this->readTxnRenewed = false;
    this->winMemoryPriority = 5;
}

EnvWrap::~EnvWrap() {
    // Close if not closed already
    if (this->env) {
        this->cleanupStrayTxns();
        mdb_env_close(env);
    }
    if (this->compression)
        this->compression->Unref();
}

void EnvWrap::cleanupStrayTxns() {
    if (this->currentWriteTxn) {
        mdb_txn_abort(this->currentWriteTxn->txn);
        this->currentWriteTxn->removeFromEnvWrap();
    }
    while (this->readTxns.size()) {
        TxnWrap *tw = *this->readTxns.begin();
        mdb_txn_abort(tw->txn);
        tw->removeFromEnvWrap();
    }
}

NAN_METHOD(EnvWrap::ctor) {
    Nan::HandleScope scope;

    int rc;

    EnvWrap* ew = new EnvWrap();
    rc = mdb_env_create(&(ew->env));

    if (rc != 0) {
        mdb_env_close(ew->env);
        return throwLmdbError(rc);
    }

    ew->Wrap(info.This());
    ew->Ref();

    return info.GetReturnValue().Set(info.This());
}

template<class T>
int applyUint32Setting(int (*f)(MDB_env *, T), MDB_env* e, Local<Object> options, T dflt, const char* keyName) {
    int rc;
    const Local<Value> value = options->Get(Nan::GetCurrentContext(), Nan::New<String>(keyName).ToLocalChecked()).ToLocalChecked();
    if (value->IsUint32()) {
        rc = f(e, value->Uint32Value(Nan::GetCurrentContext()).FromJust());
    }
    else {
        rc = f(e, dflt);
    }

    return rc;
}

class SyncWorker : public Nan::AsyncWorker {
  public:
    SyncWorker(MDB_env* env, Nan::Callback *callback)
      : Nan::AsyncWorker(callback), env(env) {}

    void Execute() {
        int rc = mdb_env_sync(env, 1);
        if (rc != 0) {
            SetErrorMessage(mdb_strerror(rc));
        }
    }

    void HandleOKCallback() {
        Nan::HandleScope scope;
        Local<v8::Value> argv[] = {
            Nan::Null()
        };

        callback->Call(1, argv, async_resource);
    }

  private:
    MDB_env* env;
};

class CopyWorker : public Nan::AsyncWorker {
  public:
    CopyWorker(MDB_env* env, char* inPath, int flags, Nan::Callback *callback)
      : Nan::AsyncWorker(callback), env(env), path(strdup(inPath)), flags(flags) {
      }
    ~CopyWorker() {
        free(path);
    }

    void Execute() {
        int rc = mdb_env_copy2(env, path, flags);
        if (rc != 0) {
            fprintf(stderr, "Error on copy code: %u\n", rc);
            SetErrorMessage("Error on copy");
        }
    }

    void HandleOKCallback() {
        Nan::HandleScope scope;
        Local<v8::Value> argv[] = {
            Nan::Null()
        };

        callback->Call(1, argv, async_resource);
    }

  private:
    MDB_env* env;
    char* path;
    int flags;
};

const int CHANGE_DB = 8;
const int RESET_CONDITION = 9;
const int USER_TRANSACTION_CALLBACK = 12;
const int CONDITION = 1;
const int WRITE_WITH_VALUE = 2;
const int DELETE_OPERATION = 4;

const int FAILED_CONDITION = 1;
const int SUCCESSFUL_OPERATION = 0;
const int BAD_KEY = 3;
const int NOT_FOUND = 2;

BatchWorkerBase::BatchWorkerBase(Nan::Callback *callback, EnvWrap* envForTxn)  : Nan::AsyncProgressWorker(callback, "lmdb:batch"),
      envForTxn(envForTxn) {
    currentTxnWrap = nullptr;    
}
BatchWorkerBase::~BatchWorkerBase() {
    uv_mutex_destroy(userCallbackLock);
    uv_cond_destroy(userCallbackCond);    
}
void BatchWorkerBase::ContinueBatch(int rc, bool hasStarted) {
    if (hasStarted) {
        finishedProgress = true;
        currentTxnWrap = envForTxn->currentWriteTxn;
    }
    envForTxn->currentWriteTxn = nullptr;
    uv_mutex_lock(userCallbackLock);
    interruptionStatus = rc;
    uv_cond_signal(userCallbackCond);
    uv_mutex_unlock(userCallbackLock);
}

class BatchWorker : public BatchWorkerBase {
  public:
    BatchWorker(MDB_env* env, action_t *actions, int actionCount, int putFlags, KeySpace* keySpace, EnvWrap* envForTxn, uint8_t* results, Nan::Callback *callback)
      : BatchWorkerBase(callback, envForTxn),
      env(env),
      actionCount(actionCount),
      results(results),
      actions(actions),
      putFlags(putFlags),
      keySpace(keySpace) {
        interruptionStatus = 0;
    }

    ~BatchWorker() {
        delete[] actions;
        delete keySpace;
    }

    void Execute(const ExecutionProgress& executionProgress) {
        MDB_txn *txn;
        // we do compression in this thread to offload from main thread, but do it before transaction to minimize time that the transaction is open
        DbiWrap* dw = nullptr;

        for (int i = 0; i < actionCount; i++) {
            action_t* action = &actions[i];
            int actionType = action->actionType;
            if (actionType == CHANGE_DB)
                dw = action->dw;
            else if (actionType & WRITE_WITH_VALUE) {
                Compression* compression = dw->compression;
                if (compression) {
                    action->freeValue = compression->compress(&action->data, action->freeValue);
                }
            }
        }

        int rc = mdb_txn_begin(env, nullptr, 0, &txn);
        if (rc != 0) {
            return SetErrorMessage(mdb_strerror(rc));
        }
        if (envForTxn) {
            envForTxn->currentBatchTxn = txn;
            userCallbackLock = new uv_mutex_t;
            userCallbackCond = new uv_cond_t;
            uv_mutex_init(userCallbackLock);
            uv_cond_init(userCallbackCond);
        }
        int validatedDepth = 0;
        int conditionDepth = 0;
        lowerMemPriority(envForTxn);
        for (int i = 0; i < actionCount;) {
            action_t* action = &actions[i];
            int actionType = action->actionType;
            if (actionType >= 8) {
                if (actionType == CHANGE_DB) {
                    // reset target db
                    dw = action->dw;
                } else if (actionType == RESET_CONDITION) {
                    // reset last condition
                    conditionDepth--;
                    if (validatedDepth > conditionDepth)
                        validatedDepth--;
                } else/* if (actionType == USER_TRANSACTION_CALLBACK) */{
                    uv_mutex_lock(userCallbackLock);
                    finishedProgress = false;
                    executionProgress.Send(reinterpret_cast<const char*>(&i), sizeof(int));
waitForCallback:
                    if (interruptionStatus == 0)
                        uv_cond_wait(userCallbackCond, userCallbackLock);
                    if (interruptionStatus != 0 && !finishedProgress) {
                        if (interruptionStatus == INTERRUPT_BATCH) { // interrupted by JS code that wants to run a synchronous transaction
                            rc = mdb_txn_commit(txn);
                            if (rc == 0) {
                                // wait again until the sync transaction is completed
                                uv_cond_wait(userCallbackCond, userCallbackLock);
                                // now restart our transaction
                                rc = mdb_txn_begin(env, nullptr, 0, &txn);
                                envForTxn->currentBatchTxn = txn;
                                interruptionStatus = 0;
                                uv_cond_signal(userCallbackCond);
                                goto waitForCallback;
                            }
                            if (rc != 0) {
                                uv_mutex_unlock(userCallbackLock);
                                return SetErrorMessage(mdb_strerror(rc));
                            }
                        } else {
                            uv_mutex_unlock(userCallbackLock);
                            rc = interruptionStatus;
                            goto done;
                        }
                    }
                    uv_mutex_unlock(userCallbackLock);
                }
                results[i++] = SUCCESSFUL_OPERATION;
                continue;
            }
            bool validated;
            if (validatedDepth < conditionDepth) {
                // we are in an invalidated branch, just need to track depth
                results[i] = FAILED_CONDITION;
                validated = false;
            } else if (actionType & CONDITION) { // has precondition
                MDB_val value;
                // TODO: Use a cursor
                rc = mdb_get(txn, dw->dbi, &action->key, &value);
                if (rc == MDB_BAD_VALSIZE) {
                    results[i] = BAD_KEY;
                    validated = false;
                } else {
                    if (action->ifVersion == NO_EXIST_VERSION) {
                        validated = rc;
                    }
                    else {
                        if (rc)
                            validated = false;
                        else
                            validated = action->ifVersion == *((double*)value.mv_data);
                    }
                    results[i] = validated ? SUCCESSFUL_OPERATION : FAILED_CONDITION;
                }
                rc = 0;
            } else {
                validated = true;
                results[i] = SUCCESSFUL_OPERATION;
            }
            if (actionType & (WRITE_WITH_VALUE | DELETE_OPERATION)) { // has write operation to perform
                if (validated) {
                    if (actionType & DELETE_OPERATION) {
                        rc = mdb_del(txn, dw->dbi, &action->key, (actionType & WRITE_WITH_VALUE) ? &action->data : nullptr);
                        if (rc == MDB_NOTFOUND) {
                            rc = 0; // ignore not_found errors
                            results[i] = NOT_FOUND;
                        }
                    } else {
                        if (dw->hasVersions)
                            rc = putWithVersion(txn, dw->dbi, &action->key, &action->data, putFlags, action->version);
                        else
                            rc = mdb_put(txn, dw->dbi, &action->key, &action->data, putFlags);
                    }
                    if (rc != 0) {
                        if (rc == MDB_BAD_VALSIZE) {
                            results[i] = BAD_KEY;
                            rc = 0;
                        } else {
                            goto done;
                        }
                    }
                }
                if (action->freeValue) {
                    action->freeValue(action->data);
                }
            } else {
                // starting condition branch
                conditionDepth++;
                if (validated)
                    validatedDepth++;
            }
            i++;
        }
done:
        if (envForTxn) {
            envForTxn->currentBatchTxn = nullptr;
            if (currentTxnWrap) {
                // if a transaction was wrapped, need to do clean up
                currentTxnWrap->removeFromEnvWrap();
            }
        }
        if (rc)
            mdb_txn_abort(txn);
        else
            rc = mdb_txn_commit(txn);
        restoreMemPriority(envForTxn);
        if (rc != 0) {
            if ((putFlags & 1) > 0) // sync mode
                return Nan::ThrowError(mdb_strerror(rc));
            else {
                return SetErrorMessage(mdb_strerror(rc));
            }
        }
    }

    void HandleProgressCallback(const char* data, size_t count) {
        Nan::HandleScope scope;
        if (interruptionStatus != 0) {
            uv_mutex_lock(userCallbackLock);
            if (interruptionStatus != 0)
                uv_cond_wait(userCallbackCond, userCallbackLock);
            // aquire the lock so that we can ensure that if it is restarting the transaction, it finishes doing that
            uv_mutex_unlock(userCallbackLock);
        }
        v8::Local<v8::Value> argv[] = {
            Nan::True()
        };
        envForTxn->currentWriteTxn = currentTxnWrap;
        bool immediateContinue = callback->Call(1, argv, async_resource).ToLocalChecked()->IsTrue();
        if (immediateContinue)
            ContinueBatch(0, true);
    }

    void HandleOKCallback() {
        Nan::HandleScope scope;
        Local<v8::Value> argv[] = {
            Nan::Null(),
        };

        callback->Call(1, argv, async_resource);
    }

  private:
    MDB_env* env;
    int actionCount;
    uint8_t* results;
    int resultIndex = 0;
    action_t* actions;
    int putFlags;
    KeySpace* keySpace;
    friend class DbiWrap;
};

MDB_txn* EnvWrap::getReadTxn() {
    MDB_txn* txn = currentWriteTxn ? currentWriteTxn->txn : nullptr;
    if (txn)
        return txn;
    txn = currentReadTxn;
    if (readTxnRenewed)
        return txn;
    if (txn)
        mdb_txn_renew(txn);
    else {
        mdb_txn_begin(env, nullptr, MDB_RDONLY, &txn);
        currentReadTxn = txn;
    }
    readTxnRenewed = true;
    return txn;
}
#ifdef MDB_RPAGE_CACHE
static int encfunc(const MDB_val* src, MDB_val* dst, const MDB_val* key, int encdec)
{
    chacha8(src->mv_data, src->mv_size, (uint8_t*) key[0].mv_data, (uint8_t*) key[1].mv_data, (char*)dst->mv_data);
    return 0;
}
#endif

void cleanup(void* data) {
    ((EnvWrap*) data)->closeEnv();
}

NAN_METHOD(EnvWrap::open) {
    Nan::HandleScope scope;

    int rc;
    int flags = 0;

    // Get the wrapper
    EnvWrap *ew = Nan::ObjectWrap::Unwrap<EnvWrap>(info.This());

    if (!ew->env) {
        return Nan::ThrowError("The environment is already closed.");
    }
    Local<Object> options = Local<Object>::Cast(info[0]);
    ew->compression = nullptr;
    Local<Value> compressionOption = options->Get(Nan::GetCurrentContext(), Nan::New<String>("compression").ToLocalChecked()).ToLocalChecked();
    if (compressionOption->IsObject()) {
        ew->compression = Nan::ObjectWrap::Unwrap<Compression>(Nan::To<Object>(compressionOption).ToLocalChecked());
        ew->compression->Ref();
    }
    Local<Value> keyBufferValue = options->Get(Nan::GetCurrentContext(), Nan::New<String>("keyBuffer").ToLocalChecked()).ToLocalChecked();
    if (keyBufferValue->IsArrayBufferView())
        ew->keyBuffer = node::Buffer::Data(keyBufferValue);

    Local<Value> onReadTxnRenew = options->Get(Nan::GetCurrentContext(), Nan::New<String>("onReadTxnRenew").ToLocalChecked()).ToLocalChecked();
    ew->onReadTxnRenew.Reset(Local<Function>::Cast(onReadTxnRenew));
    Local<Value> winMemoryPriorityLocal = options->Get(Nan::GetCurrentContext(), Nan::New<String>("winMemoryPriority").ToLocalChecked()).ToLocalChecked();
    if (winMemoryPriorityLocal->IsNumber())
        ew->winMemoryPriority = winMemoryPriorityLocal->IntegerValue(Nan::GetCurrentContext()).FromJust();


    Local<String> path = Local<String>::Cast(options->Get(Nan::GetCurrentContext(), Nan::New<String>("path").ToLocalChecked()).ToLocalChecked());
    Nan::Utf8String charPath(path);
    uv_mutex_lock(envsLock);
    for (env_path_t envPath : envs) {
        char* existingPath = envPath.path;
        if (!strcmp(existingPath, *charPath)) {
            envPath.count++;
            mdb_env_close(ew->env);
            ew->env = envPath.env;
            uv_mutex_unlock(envsLock);
            return;
        }
    }

    // Parse the maxDbs option
    rc = applyUint32Setting<unsigned>(&mdb_env_set_maxdbs, ew->env, options, 1, "maxDbs");
    if (rc != 0) {
        uv_mutex_unlock(envsLock);
        return throwLmdbError(rc);
    }

    // Parse the mapSize option
    Local<Value> mapSizeOption = options->Get(Nan::GetCurrentContext(), Nan::New<String>("mapSize").ToLocalChecked()).ToLocalChecked();
    if (mapSizeOption->IsNumber()) {
        mdb_size_t mapSizeSizeT = mapSizeOption->IntegerValue(Nan::GetCurrentContext()).FromJust();
        rc = mdb_env_set_mapsize(ew->env, mapSizeSizeT);
        if (rc != 0) {
            uv_mutex_unlock(envsLock);
            return throwLmdbError(rc);
        }
    }

    Local<Value> encryptionKey = options->Get(Nan::GetCurrentContext(), Nan::New<String>("encryptionKey").ToLocalChecked()).ToLocalChecked();
    if (!encryptionKey->IsUndefined()) {
        MDB_val enckey;
        KeySpace* keySpace = new KeySpace(false);
        rc = valueToMDBKey(encryptionKey, enckey, *keySpace);
        if (!rc)
            return Nan::ThrowError("Bad encryption key");
        if (enckey.mv_size != 32) {
            return Nan::ThrowError("Encryption key must be 32 bytes long");
        }
        #ifdef MDB_RPAGE_CACHE
        rc = mdb_env_set_encrypt(ew->env, encfunc, &enckey, 0);
        #else
        return Nan::ThrowError("Encryption not supported with data format version 1");
        #endif
        if (rc != 0) {
            return throwLmdbError(rc);
        }
    }

    // Parse the maxReaders option
    // NOTE: mdb.c defines DEFAULT_READERS as 126
    rc = applyUint32Setting<unsigned>(&mdb_env_set_maxreaders, ew->env, options, 126, "maxReaders");
    if (rc != 0) {
        return throwLmdbError(rc);
    }

    #ifdef MDB_RPAGE_CACHE
    // Parse the pageSize option
    // default is 4096
    rc = applyUint32Setting<int>(&mdb_env_set_pagesize, ew->env, options, 4096, "pageSize");
    if (rc != 0) {
        return throwLmdbError(rc);
    }
    #endif

    // NOTE: MDB_FIXEDMAP is not exposed here since it is "highly experimental" + it is irrelevant for this use case
    // NOTE: MDB_NOTLS is not exposed here because it is irrelevant for this use case, as node will run all this on a single thread anyway
    setFlagFromValue(&flags, MDB_NOSUBDIR, "noSubdir", false, options);
    setFlagFromValue(&flags, MDB_RDONLY, "readOnly", false, options);
    setFlagFromValue(&flags, MDB_WRITEMAP, "useWritemap", false, options);
    setFlagFromValue(&flags, MDB_PREVSNAPSHOT, "usePreviousSnapshot", false, options);
    setFlagFromValue(&flags, MDB_NOMEMINIT , "noMemInit", false, options);
    setFlagFromValue(&flags, MDB_NORDAHEAD , "noReadAhead", false, options);
    setFlagFromValue(&flags, MDB_NOMETASYNC, "noMetaSync", false, options);
    setFlagFromValue(&flags, MDB_NOSYNC, "noSync", false, options);
    setFlagFromValue(&flags, MDB_MAPASYNC, "mapAsync", false, options);
    setFlagFromValue(&flags, MDB_NOLOCK, "unsafeNoLock", false, options);
    #ifdef MDB_RPAGE_CACHE
    setFlagFromValue(&flags, MDB_REMAP_CHUNKS, "remapChunks", false, options);
    #endif

    if (flags & MDB_NOLOCK) {
        fprintf(stderr, "You chose to use MDB_NOLOCK which is not officially supported by node-lmdb. You have been warned!\n");
    }

    // Set MDB_NOTLS to enable multiple read-only transactions on the same thread (in this case, the nodejs main thread)
    flags |= MDB_NOTLS;
    // TODO: make file attributes configurable
    #if NODE_VERSION_AT_LEAST(12,0,0)
    rc = mdb_env_open(ew->env, *String::Utf8Value(Isolate::GetCurrent(), path), flags, 0664);
    #else
    rc = mdb_env_open(ew->env, *String::Utf8Value(path), flags, 0664);
    #endif

    if (rc != 0) {
        mdb_env_close(ew->env);
        uv_mutex_unlock(envsLock);
        ew->env = nullptr;
        return throwLmdbError(rc);
    }
    node::AddEnvironmentCleanupHook(Isolate::GetCurrent(), cleanup, ew);
    env_path_t envPath;
    envPath.path = strdup(*charPath);
    envPath.env = ew->env;
    envPath.count = 1;
    envs.push_back(envPath);
    uv_mutex_unlock(envsLock);
}

NAN_METHOD(EnvWrap::resize) {
    Nan::HandleScope scope;

    // Get the wrapper
    EnvWrap *ew = Nan::ObjectWrap::Unwrap<EnvWrap>(info.This());

    if (!ew->env) {
        return Nan::ThrowError("The environment is already closed.");
    }

    // Check that the correct number/type of arguments was given.
    if (info.Length() != 1 || !info[0]->IsNumber()) {
        return Nan::ThrowError("Call env.resize() with exactly one argument which is a number.");
    }

    // Since this function may only be called if no transactions are active in this process, check this condition.
    if (ew->currentWriteTxn/* || ew->readTxns.size()*/) {
        return Nan::ThrowError("Only call env.resize() when there are no active transactions. Please close all transactions before calling env.resize().");
    }

    mdb_size_t mapSizeSizeT = info[0]->IntegerValue(Nan::GetCurrentContext()).FromJust();
    lowerMemPriority(ew);
    int rc = mdb_env_set_mapsize(ew->env, mapSizeSizeT);
    restoreMemPriority(ew);
    if (rc == EINVAL) {
        //fprintf(stderr, "Resize failed, will try to get transaction and try again");
        MDB_txn *txn;
        rc = mdb_txn_begin(ew->env, nullptr, 0, &txn);
        if (rc != 0)
            return throwLmdbError(rc);
        rc = mdb_txn_commit(txn);
        if (rc != 0)
            return throwLmdbError(rc);
        rc = mdb_env_set_mapsize(ew->env, mapSizeSizeT);
    }
    if (rc != 0) {
        return throwLmdbError(rc);
    }
}

void EnvWrap::closeEnv() {
    cleanupStrayTxns();

    uv_mutex_lock(envsLock);
    for (auto envPath = envs.begin(); envPath != envs.end(); ) {
        if (envPath->env == env) {
            envPath->count--;
            if (envPath->count <= 0) {
                // last thread using it, we can really close it now
                envs.erase(envPath);
                mdb_env_close(env);
            }
            break;
        }
        ++envPath;
    }
    uv_mutex_unlock(envsLock);

    env = nullptr;

}
NAN_METHOD(EnvWrap::close) {
    EnvWrap *ew = Nan::ObjectWrap::Unwrap<EnvWrap>(info.This());
    ew->Unref();

    if (!ew->env) {
        return Nan::ThrowError("The environment is already closed.");
    }
    ew->closeEnv();
}

NAN_METHOD(EnvWrap::stat) {
    Nan::HandleScope scope;

    // Get the wrapper
    EnvWrap *ew = Nan::ObjectWrap::Unwrap<EnvWrap>(info.This());
    if (!ew->env) {
        return Nan::ThrowError("The environment is already closed.");
    }

    int rc;
    MDB_stat stat;

    rc = mdb_env_stat(ew->env, &stat);
    if (rc != 0) {
        return throwLmdbError(rc);
    }

    Local<Context> context = Nan::GetCurrentContext();
    Local<Object> obj = Nan::New<Object>();
    (void)obj->Set(context, Nan::New<String>("pageSize").ToLocalChecked(), Nan::New<Number>(stat.ms_psize));
    (void)obj->Set(context, Nan::New<String>("treeDepth").ToLocalChecked(), Nan::New<Number>(stat.ms_depth));
    (void)obj->Set(context, Nan::New<String>("treeBranchPageCount").ToLocalChecked(), Nan::New<Number>(stat.ms_branch_pages));
    (void)obj->Set(context, Nan::New<String>("treeLeafPageCount").ToLocalChecked(), Nan::New<Number>(stat.ms_leaf_pages));
    (void)obj->Set(context, Nan::New<String>("entryCount").ToLocalChecked(), Nan::New<Number>(stat.ms_entries));
    (void)obj->Set(context, Nan::New<String>("overflowPages").ToLocalChecked(), Nan::New<Number>(stat.ms_overflow_pages));

    info.GetReturnValue().Set(obj);
}

NAN_METHOD(EnvWrap::freeStat) {
    Nan::HandleScope scope;

    // Get the wrapper
    EnvWrap *ew = Nan::ObjectWrap::Unwrap<EnvWrap>(info.This());
    if (!ew->env) {
        return Nan::ThrowError("The environment is already closed.");
    }

    if (info.Length() != 1) {
        return Nan::ThrowError("env.freeStat should be called with a single argument which is a txn.");
    }

    TxnWrap *txn = Nan::ObjectWrap::Unwrap<TxnWrap>(Local<Object>::Cast(info[0]));

    int rc;
    MDB_stat stat;

    rc = mdb_stat(txn->txn, 0, &stat);
    if (rc != 0) {
        return throwLmdbError(rc);
    }

    Local<Context> context = Nan::GetCurrentContext();
    Local<Object> obj = Nan::New<Object>();
    (void)obj->Set(context, Nan::New<String>("pageSize").ToLocalChecked(), Nan::New<Number>(stat.ms_psize));
    (void)obj->Set(context, Nan::New<String>("treeDepth").ToLocalChecked(), Nan::New<Number>(stat.ms_depth));
    (void)obj->Set(context, Nan::New<String>("treeBranchPageCount").ToLocalChecked(), Nan::New<Number>(stat.ms_branch_pages));
    (void)obj->Set(context, Nan::New<String>("treeLeafPageCount").ToLocalChecked(), Nan::New<Number>(stat.ms_leaf_pages));
    (void)obj->Set(context, Nan::New<String>("entryCount").ToLocalChecked(), Nan::New<Number>(stat.ms_entries));
    (void)obj->Set(context, Nan::New<String>("overflowPages").ToLocalChecked(), Nan::New<Number>(stat.ms_overflow_pages));

    info.GetReturnValue().Set(obj);
}

NAN_METHOD(EnvWrap::info) {
    Nan::HandleScope scope;

    // Get the wrapper
    EnvWrap *ew = Nan::ObjectWrap::Unwrap<EnvWrap>(info.This());
    if (!ew->env) {
        return Nan::ThrowError("The environment is already closed.");
    }

    int rc;
    MDB_envinfo envinfo;

    rc = mdb_env_info(ew->env, &envinfo);
    if (rc != 0) {
        return throwLmdbError(rc);
    }

    Local<Context> context = Nan::GetCurrentContext();
    Local<Object> obj = Nan::New<Object>();
    (void)obj->Set(context, Nan::New<String>("mapAddress").ToLocalChecked(), Nan::New<Number>((uint64_t) envinfo.me_mapaddr));
    (void)obj->Set(context, Nan::New<String>("mapSize").ToLocalChecked(), Nan::New<Number>(envinfo.me_mapsize));
    (void)obj->Set(context, Nan::New<String>("lastPageNumber").ToLocalChecked(), Nan::New<Number>(envinfo.me_last_pgno));
    (void)obj->Set(context, Nan::New<String>("lastTxnId").ToLocalChecked(), Nan::New<Number>(envinfo.me_last_txnid));
    (void)obj->Set(context, Nan::New<String>("maxReaders").ToLocalChecked(), Nan::New<Number>(envinfo.me_maxreaders));
    (void)obj->Set(context, Nan::New<String>("numReaders").ToLocalChecked(), Nan::New<Number>(envinfo.me_numreaders));

    info.GetReturnValue().Set(obj);
}

NAN_METHOD(EnvWrap::readerCheck) {
    Nan::HandleScope scope;

    // Get the wrapper
    EnvWrap *ew = Nan::ObjectWrap::Unwrap<EnvWrap>(info.This());
    if (!ew->env) {
        return Nan::ThrowError("The environment is already closed.");
    }

    int rc, dead;
    rc = mdb_reader_check(ew->env, &dead);
    if (rc != 0) {
        return throwLmdbError(rc);
    }

    info.GetReturnValue().Set(Nan::New<Number>(dead));
}

Local<Array> readerStrings;
MDB_msg_func* printReaders = ([](const char* message, void* ctx) -> int {
    readerStrings->Set(Nan::GetCurrentContext(), readerStrings->Length(), Nan::New<String>(message).ToLocalChecked()).ToChecked();
    return 0;
});

NAN_METHOD(EnvWrap::readerList) {
    Nan::HandleScope scope;

    // Get the wrapper
    EnvWrap* ew = Nan::ObjectWrap::Unwrap<EnvWrap>(info.This());
    if (!ew->env) {
        return Nan::ThrowError("The environment is already closed.");
    }

    readerStrings = Nan::New<Array>(0);
    int rc;
    rc = mdb_reader_list(ew->env, printReaders, nullptr);
    if (rc != 0) {
        return throwLmdbError(rc);
    }
    info.GetReturnValue().Set(readerStrings);
}


NAN_METHOD(EnvWrap::copy) {
    Nan::HandleScope scope;

    // Get the wrapper
    EnvWrap *ew = Nan::ObjectWrap::Unwrap<EnvWrap>(info.This());

    if (!ew->env) {
        return Nan::ThrowError("The environment is already closed.");
    }

    // Check that the correct number/type of arguments was given.
    if (!info[0]->IsString()) {
        return Nan::ThrowError("Call env.copy(path, compact?, callback) with a file path.");
    }
    if (!info[info.Length() - 1]->IsFunction()) {
        return Nan::ThrowError("Call env.copy(path, compact?, callback) with a file path.");
    }
    Nan::Utf8String path(info[0].As<String>());

    int flags = 0;
    if (info.Length() > 1 && info[1]->IsTrue()) {
        flags = MDB_CP_COMPACT;
    }

    Nan::Callback* callback = new Nan::Callback(
      Local<v8::Function>::Cast(info[info.Length()  > 2 ? 2 : 1])
    );

    CopyWorker* worker = new CopyWorker(
      ew->env, *path, flags, callback
    );

    Nan::AsyncQueueWorker(worker);
}

NAN_METHOD(EnvWrap::detachBuffer) {
    Nan::HandleScope scope;
    #if NODE_VERSION_AT_LEAST(12,0,0)
    Local<v8::ArrayBuffer>::Cast(info[0])->Detach();
    #endif
}

NAN_METHOD(EnvWrap::beginTxn) {
    Nan::HandleScope scope;

    Nan::MaybeLocal<Object> maybeInstance;

    if (info.Length() > 1) {
        const int argc = 3;

        Local<Value> argv[argc] = { info.This(), info[0], info[1] };
        maybeInstance = Nan::NewInstance(Nan::New(*txnCtor), argc, argv);

    } else {
        const int argc = 2;

        Local<Value> argv[argc] = { info.This(), info[0] };
        maybeInstance = Nan::NewInstance(Nan::New(*txnCtor), argc, argv);
    }

    // Check if txn could be created
    if ((maybeInstance.IsEmpty())) {
        // The maybeInstance is empty because the txnCtor called Nan::ThrowError.
        // No need to call that here again, the user will get the error thrown there.
        return;
    }

    Local<Object> instance = maybeInstance.ToLocalChecked();
    info.GetReturnValue().Set(instance);
}

NAN_METHOD(EnvWrap::openDbi) {
    Nan::HandleScope scope;

    const unsigned argc = 2;
    Local<Value> argv[argc] = { info.This(), info[0] };
    Nan::MaybeLocal<Object> maybeInstance = Nan::NewInstance(Nan::New(*dbiCtor), argc, argv);

    // Check if database could be opened
    if ((maybeInstance.IsEmpty())) {
        // The maybeInstance is empty because the dbiCtor called Nan::ThrowError.
        // No need to call that here again, the user will get the error thrown there.
        return;
    }

    Local<Object> instance = maybeInstance.ToLocalChecked();
    info.GetReturnValue().Set(instance);
}

NAN_METHOD(EnvWrap::sync) {
    Nan::HandleScope scope;

    EnvWrap *ew = Nan::ObjectWrap::Unwrap<EnvWrap>(info.This());

    if (!ew->env) {
        return Nan::ThrowError("The environment is already closed.");
    }

    Nan::Callback* callback = new Nan::Callback(
      Local<v8::Function>::Cast(info[0])
    );

    SyncWorker* worker = new SyncWorker(
      ew->env, callback
    );

    Nan::AsyncQueueWorker(worker);
    return;
}


NAN_METHOD(EnvWrap::batchWrite) {
    Nan::HandleScope scope;

    EnvWrap *ew = Nan::ObjectWrap::Unwrap<EnvWrap>(info.This());
    Local<Context> context = Nan::GetCurrentContext();

    if (!ew->env) {
        return Nan::ThrowError("The environment is already closed.");
    }
    Local<v8::Array> array = Local<v8::Array>::Cast(info[0]);

    int length = array->Length();
    action_t* actions = new action_t[length];

    int putFlags = 0;
    KeySpace* keySpace = new KeySpace(false);
    Nan::Callback* callback;
    uint8_t* results = (uint8_t*) node::Buffer::Data(Local<Object>::Cast(info[1]));
    Local<Value> options = info[2];

    if (!info[2]->IsNull() && !info[2]->IsUndefined() && info[2]->IsObject() && !info[2]->IsFunction()) {
        Local<Object> optionsObject = Local<Object>::Cast(options);
        setFlagFromValue(&putFlags, MDB_NODUPDATA, "noDupData", false, optionsObject);
        setFlagFromValue(&putFlags, MDB_NOOVERWRITE, "noOverwrite", false, optionsObject);
        setFlagFromValue(&putFlags, MDB_APPEND, "append", false, optionsObject);
        setFlagFromValue(&putFlags, MDB_APPENDDUP, "appendDup", false, optionsObject);
        callback = new Nan::Callback(
            Local<v8::Function>::Cast(info[3])
        );
    } else {
        if (info.Length() > 2 || info[0]->IsFunction())
            callback = new Nan::Callback(
                Local<v8::Function>::Cast(info[2])
            );
        else {
            // sync mode
            putFlags &= 1;
            callback = nullptr;
        }
    }

    BatchWorker* worker = new BatchWorker(
        ew->env, actions, length, putFlags, keySpace, ew, results, callback
    );
    ew->batchWorker = worker;
    bool keyIsValid = false;
    NodeLmdbKeyType keyType;
    DbiWrap* dw = nullptr;

    for (unsigned int i = 0; i < array->Length(); i++) {
        //Local<Value> element = array->Get(context, i).ToLocalChecked(); // checked/enforce in js
        //if (!element->IsObject())
          //  continue;
        action_t* action = &actions[i];
        Local<Value> operationValue = array->Get(context, i).ToLocalChecked();

        bool isArray = operationValue->IsArray();
        if (!isArray) {
            // change target db
            if (operationValue->IsObject()) {
                action->actionType = CHANGE_DB;
                dw = action->dw = Nan::ObjectWrap::Unwrap<DbiWrap>(Local<Object>::Cast(operationValue));
            } else if (operationValue->IsTrue()) {
                action->actionType = USER_TRANSACTION_CALLBACK;
            } else { // else false
                // reset condition
                action->actionType = RESET_CONDITION;
            }
            continue;
            // if we did not coordinate to always reference the object on the JS side, we would need this (but it is expensive):
            // worker->SaveToPersistent(persistedIndex++, currentDb);
        }
        Local<Object> operation = Local<Object>::Cast(operationValue);
        Local<v8::Value> key = operation->Get(context, 0).ToLocalChecked();
        
        keyType = dw->keyType;
        if (keyType == NodeLmdbKeyType::DefaultKey) {
            keyIsValid = valueToMDBKey(key, action->key, *keySpace);
        }
        else {
            argToKey(key, action->key, keyType, keyIsValid);
            if (!keyIsValid) {
                // argToKey already threw an error
                delete worker;
                return;
            }
        }

        // if we did not coordinate to always reference the object on the JS side, we would need this (but it is expensive):
        //if (!action->freeKey)
          //  worker->SaveToPersistent(persistedIndex++, key);
        Local<v8::Value> value = operation->Get(context, 1).ToLocalChecked();

        if (dw->hasVersions) {
            if (value->IsNumber()) {
                action->actionType = CONDITION; // checking version action type
                action->ifVersion = Nan::To<v8::Number>(value).ToLocalChecked()->Value();
                continue;
            }
            action->actionType = CONDITION | WRITE_WITH_VALUE; // conditional save value
            // TODO: Check length before continuing?
            double version = 0;
            Local<v8::Value> versionValue = operation->Get(context, 2).ToLocalChecked();
            if (versionValue->IsNumber())
                version = Nan::To<v8::Number>(versionValue).ToLocalChecked()->Value();
            action->version = version;

            versionValue = operation->Get(context, 3).ToLocalChecked();
            if (versionValue->IsNumber())
                version = Nan::To<v8::Number>(versionValue).ToLocalChecked()->Value();
            else if (versionValue->IsNull())
                version = NO_EXIST_VERSION;
            else
                action->actionType = WRITE_WITH_VALUE;
            action->ifVersion = version;
        } else {
            Local<v8::Value> deleteValue = operation->Get(context, 2).ToLocalChecked();
            if (deleteValue->IsTrue()) // useful for dupsort so we can specify a specfic value to delete
                action->actionType = DELETE_OPERATION | WRITE_WITH_VALUE;
            else
                action->actionType = WRITE_WITH_VALUE;
        }

        if (value->IsNull() || value->IsUndefined()) {
            // standard delete (no regard for value)
            action->actionType = DELETE_OPERATION | (action->actionType & CONDITION); // only DELETE_OPERATION, no WRITE_WITH_VALUE
            action->freeValue = nullptr;
        } else if (value->IsArrayBufferView()) {
            int size = action->data.mv_size = node::Buffer::Length(value);
            action->data.mv_data = size > 0 ? node::Buffer::Data(value) : nullptr;
            action->freeValue = nullptr; // don't free, belongs to node
            //worker->SaveToPersistent(persistedIndex++, value); // this is coordinated to always be referenced on the JS side
        } else {
            writeValueToEntry(Nan::To<v8::String>(value).ToLocalChecked(), &action->data);
            action->freeValue = ([](MDB_val &value) -> void {
                delete[] (char*)value.mv_data;
            });
        }
    }

    //worker->SaveToPersistent("env", info.This()); // this is coordinated to always be referenced on the JS side
    if (callback) {
        Nan::AsyncQueueWorker(worker);
    } else {
        // sync mode
        //AsyncProgressWorker::ExecutionProgress executionProgress(worker);
        //worker->Execute(/*&executionProgress*/);
        delete worker;
    }
    return;
}

NAN_METHOD(EnvWrap::continueBatch) {
    EnvWrap* ew = Nan::ObjectWrap::Unwrap<EnvWrap>(info.This());
    ew->batchWorker->ContinueBatch(info[0]->IntegerValue(Nan::GetCurrentContext()).FromJust(), true);
}

NAN_METHOD(EnvWrap::resetCurrentReadTxn) {
    EnvWrap* ew = Nan::ObjectWrap::Unwrap<EnvWrap>(info.This());
    mdb_txn_reset(ew->currentReadTxn);
    ew->readTxnRenewed = false;
}

void EnvWrap::setupExports(Local<Object> exports) {
    // EnvWrap: Prepare constructor template
    Local<FunctionTemplate> envTpl = Nan::New<FunctionTemplate>(EnvWrap::ctor);
    envTpl->SetClassName(Nan::New<String>("Env").ToLocalChecked());
    envTpl->InstanceTemplate()->SetInternalFieldCount(1);
    // EnvWrap: Add functions to the prototype
    Isolate *isolate = Isolate::GetCurrent();
    envTpl->PrototypeTemplate()->Set(isolate, "open", Nan::New<FunctionTemplate>(EnvWrap::open));
    envTpl->PrototypeTemplate()->Set(isolate, "close", Nan::New<FunctionTemplate>(EnvWrap::close));
    envTpl->PrototypeTemplate()->Set(isolate, "beginTxn", Nan::New<FunctionTemplate>(EnvWrap::beginTxn));
    envTpl->PrototypeTemplate()->Set(isolate, "openDbi", Nan::New<FunctionTemplate>(EnvWrap::openDbi));
    envTpl->PrototypeTemplate()->Set(isolate, "sync", Nan::New<FunctionTemplate>(EnvWrap::sync));
    envTpl->PrototypeTemplate()->Set(isolate, "batchWrite", Nan::New<FunctionTemplate>(EnvWrap::batchWrite));
    envTpl->PrototypeTemplate()->Set(isolate, "continueBatch", Nan::New<FunctionTemplate>(EnvWrap::continueBatch));
    envTpl->PrototypeTemplate()->Set(isolate, "stat", Nan::New<FunctionTemplate>(EnvWrap::stat));
    envTpl->PrototypeTemplate()->Set(isolate, "freeStat", Nan::New<FunctionTemplate>(EnvWrap::freeStat));
    envTpl->PrototypeTemplate()->Set(isolate, "info", Nan::New<FunctionTemplate>(EnvWrap::info));
    envTpl->PrototypeTemplate()->Set(isolate, "readerCheck", Nan::New<FunctionTemplate>(EnvWrap::readerCheck));
    envTpl->PrototypeTemplate()->Set(isolate, "readerList", Nan::New<FunctionTemplate>(EnvWrap::readerList));
    envTpl->PrototypeTemplate()->Set(isolate, "resize", Nan::New<FunctionTemplate>(EnvWrap::resize));
    envTpl->PrototypeTemplate()->Set(isolate, "copy", Nan::New<FunctionTemplate>(EnvWrap::copy));
    envTpl->PrototypeTemplate()->Set(isolate, "detachBuffer", Nan::New<FunctionTemplate>(EnvWrap::detachBuffer));
    envTpl->PrototypeTemplate()->Set(isolate, "resetCurrentReadTxn", Nan::New<FunctionTemplate>(EnvWrap::resetCurrentReadTxn));

    // TxnWrap: Prepare constructor template
    Local<FunctionTemplate> txnTpl = Nan::New<FunctionTemplate>(TxnWrap::ctor);
    txnTpl->SetClassName(Nan::New<String>("Txn").ToLocalChecked());
    txnTpl->InstanceTemplate()->SetInternalFieldCount(1);
    // TxnWrap: Add functions to the prototype
    txnTpl->PrototypeTemplate()->Set(isolate, "commit", Nan::New<FunctionTemplate>(TxnWrap::commit));
    txnTpl->PrototypeTemplate()->Set(isolate, "abort", Nan::New<FunctionTemplate>(TxnWrap::abort));
    txnTpl->PrototypeTemplate()->Set(isolate, "getString", Nan::New<FunctionTemplate>(TxnWrap::getString));
    txnTpl->PrototypeTemplate()->Set(isolate, "getStringUnsafe", Nan::New<FunctionTemplate>(TxnWrap::getStringUnsafe));
    txnTpl->PrototypeTemplate()->Set(isolate, "getUtf8", Nan::New<FunctionTemplate>(TxnWrap::getUtf8));
    txnTpl->PrototypeTemplate()->Set(isolate, "getBinary", Nan::New<FunctionTemplate>(TxnWrap::getBinary));
    txnTpl->PrototypeTemplate()->Set(isolate, "getBinaryUnsafe", Nan::New<FunctionTemplate>(TxnWrap::getBinaryUnsafe));
    txnTpl->PrototypeTemplate()->Set(isolate, "getNumber", Nan::New<FunctionTemplate>(TxnWrap::getNumber));
    txnTpl->PrototypeTemplate()->Set(isolate, "getBoolean", Nan::New<FunctionTemplate>(TxnWrap::getBoolean));
    txnTpl->PrototypeTemplate()->Set(isolate, "putString", Nan::New<FunctionTemplate>(TxnWrap::putString));
    txnTpl->PrototypeTemplate()->Set(isolate, "putBinary", Nan::New<FunctionTemplate>(TxnWrap::putBinary));
    txnTpl->PrototypeTemplate()->Set(isolate, "putNumber", Nan::New<FunctionTemplate>(TxnWrap::putNumber));
    txnTpl->PrototypeTemplate()->Set(isolate, "putBoolean", Nan::New<FunctionTemplate>(TxnWrap::putBoolean));
    txnTpl->PrototypeTemplate()->Set(isolate, "putUtf8", Nan::New<FunctionTemplate>(TxnWrap::putUtf8));
    txnTpl->PrototypeTemplate()->Set(isolate, "del", Nan::New<FunctionTemplate>(TxnWrap::del));
    txnTpl->PrototypeTemplate()->Set(isolate, "reset", Nan::New<FunctionTemplate>(TxnWrap::reset));
    txnTpl->PrototypeTemplate()->Set(isolate, "renew", Nan::New<FunctionTemplate>(TxnWrap::renew));
    // TODO: wrap mdb_cmp too
    // TODO: wrap mdb_dcmp too
    // TxnWrap: Get constructor
    EnvWrap::txnCtor = new Nan::Persistent<Function>();
    EnvWrap::txnCtor->Reset( txnTpl->GetFunction(Nan::GetCurrentContext()).ToLocalChecked());

    // DbiWrap: Prepare constructor template
    Local<FunctionTemplate> dbiTpl = Nan::New<FunctionTemplate>(DbiWrap::ctor);
    dbiTpl->SetClassName(Nan::New<String>("Dbi").ToLocalChecked());
    dbiTpl->InstanceTemplate()->SetInternalFieldCount(1);
    // DbiWrap: Add functions to the prototype
    dbiTpl->PrototypeTemplate()->Set(isolate, "close", Nan::New<FunctionTemplate>(DbiWrap::close));
    dbiTpl->PrototypeTemplate()->Set(isolate, "drop", Nan::New<FunctionTemplate>(DbiWrap::drop));
    dbiTpl->PrototypeTemplate()->Set(isolate, "dropAsync", Nan::New<FunctionTemplate>(DbiWrap::dropAsync));
    dbiTpl->PrototypeTemplate()->Set(isolate, "stat", Nan::New<FunctionTemplate>(DbiWrap::stat));
    #if ENABLE_FAST_API && NODE_VERSION_AT_LEAST(16,6,0)
    auto getFast = CFunction::Make(DbiWrap::getByBinaryFast);
    dbiTpl->PrototypeTemplate()->Set(isolate, "getByBinary", v8::FunctionTemplate::New(
          isolate, DbiWrap::getByBinary, v8::Local<v8::Value>(),
          v8::Local<v8::Signature>(), 0, v8::ConstructorBehavior::kThrow,
          v8::SideEffectType::kHasNoSideEffect, &getFast));
    #else
    dbiTpl->PrototypeTemplate()->Set(isolate, "getByBinary", v8::FunctionTemplate::New(
          isolate, DbiWrap::getByBinary, v8::Local<v8::Value>(),
          v8::Local<v8::Signature>(), 0, v8::ConstructorBehavior::kThrow,
          v8::SideEffectType::kHasNoSideEffect));
    #endif
    dbiTpl->PrototypeTemplate()->Set(isolate, "getByPrimitive", Nan::New<FunctionTemplate>(DbiWrap::getByPrimitive));
    dbiTpl->PrototypeTemplate()->Set(isolate, "getStringByPrimitive", Nan::New<FunctionTemplate>(DbiWrap::getStringByPrimitive));
    dbiTpl->PrototypeTemplate()->Set(isolate, "stat", Nan::New<FunctionTemplate>(DbiWrap::stat));


    // TODO: wrap mdb_stat too
    // DbiWrap: Get constructor
    EnvWrap::dbiCtor = new Nan::Persistent<Function>();
    EnvWrap::dbiCtor->Reset( dbiTpl->GetFunction(Nan::GetCurrentContext()).ToLocalChecked());

    Local<FunctionTemplate> compressionTpl = Nan::New<FunctionTemplate>(Compression::ctor);
    compressionTpl->SetClassName(Nan::New<String>("Compression").ToLocalChecked());
    compressionTpl->InstanceTemplate()->SetInternalFieldCount(1);
    (void)exports->Set(Nan::GetCurrentContext(), Nan::New<String>("Compression").ToLocalChecked(), compressionTpl->GetFunction(Nan::GetCurrentContext()).ToLocalChecked());

    // Set exports
    (void)exports->Set(Nan::GetCurrentContext(), Nan::New<String>("Env").ToLocalChecked(), envTpl->GetFunction(Nan::GetCurrentContext()).ToLocalChecked());
}
