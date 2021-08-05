
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
#include <cstdio>

using namespace v8;
using namespace node;

void setFlagFromValue(int *flags, int flag, const char *name, bool defaultValue, Local<Object> options);

DbiWrap::DbiWrap(MDB_env *env, MDB_dbi dbi) {
    this->env = env;
    this->dbi = dbi;
    this->keyType = NodeLmdbKeyType::DefaultKey;
    this->compression = nullptr;
    this->isOpen = false;
    this->getFast = false;
    this->keysUse32LE = false;
    this->valuesUse32LE = false;
    this->ew = nullptr;
}

DbiWrap::~DbiWrap() {
    // Imagine the following JS:
    // ------------------------
    //     var dbi1 = env.openDbi({ name: "hello" });
    //     var dbi2 = env.openDbi({ name: "hello" });
    //     dbi1.close();
    //     txn.putString(dbi2, "world");
    // -----
    // The above DbiWrap objects would both wrap the same MDB_dbi, and if closing the first one called mdb_dbi_close,
    // that'd also render the second DbiWrap instance unusable.
    //
    // For this reason, we will never call mdb_dbi_close
    // NOTE: according to LMDB authors, it is perfectly fine if mdb_dbi_close is never called on an MDB_dbi

    if (this->ew) {
        this->ew->Unref();
    }
    if (this->compression)
        this->compression->Unref();
}

void DbiWrap::setUnsafeBuffer(char* unsafePtr, const Persistent<Object> &unsafeBuffer) {
    if (lastUnsafePtr != unsafePtr) {
        (void)handle()->Set(Nan::GetCurrentContext(), Nan::New<String>("unsafeBuffer").ToLocalChecked(),
            unsafeBuffer.Get(Isolate::GetCurrent()));
        lastUnsafePtr = unsafePtr;
    }
}


NAN_METHOD(DbiWrap::ctor) {
    Nan::HandleScope scope;

    MDB_dbi dbi;
    MDB_txn *txn;
    int rc;
    int flags = 0;
    int txnFlags = 0;
    Local<String> name;
    bool nameIsNull = false;
    NodeLmdbKeyType keyType = NodeLmdbKeyType::DefaultKey;
    bool needsTransaction = true;
    bool isOpen = false;
    bool hasVersions = false;
    bool keysUse32LE = false;
    bool valuesUse32LE = false;

    EnvWrap *ew = Nan::ObjectWrap::Unwrap<EnvWrap>(Local<Object>::Cast(info[0]));
    Compression* compression = ew->compression;

    if (info[1]->IsObject()) {
        Local<Object> options = Local<Object>::Cast(info[1]);
        nameIsNull = options->Get(Nan::GetCurrentContext(), Nan::New<String>("name").ToLocalChecked()).ToLocalChecked()->IsNull();
        name = Local<String>::Cast(options->Get(Nan::GetCurrentContext(), Nan::New<String>("name").ToLocalChecked()).ToLocalChecked());

        // Get flags from options

        // NOTE: mdb_set_relfunc is not exposed because MDB_FIXEDMAP is "highly experimental"
        // NOTE: mdb_set_relctx is not exposed because MDB_FIXEDMAP is "highly experimental"
        setFlagFromValue(&flags, MDB_REVERSEKEY, "reverseKey", false, options);
        setFlagFromValue(&flags, MDB_DUPSORT, "dupSort", false, options);
        setFlagFromValue(&flags, MDB_DUPFIXED, "dupFixed", false, options);
        setFlagFromValue(&flags, MDB_INTEGERDUP, "integerDup", false, options);
        setFlagFromValue(&flags, MDB_REVERSEDUP, "reverseDup", false, options);
        setFlagFromValue(&flags, MDB_CREATE, "create", false, options);

        // TODO: wrap mdb_set_compare
        // TODO: wrap mdb_set_dupsort

        keyType = keyTypeFromOptions(options);
        if (keyType == NodeLmdbKeyType::InvalidKey) {
            // NOTE: Error has already been thrown inside keyTypeFromOptions
            return;
        }
        
        if (keyType == NodeLmdbKeyType::Uint32Key) {
            flags |= MDB_INTEGERKEY;
        }
        Local<Value> compressionOption = options->Get(Nan::GetCurrentContext(), Nan::New<String>("compression").ToLocalChecked()).ToLocalChecked();
        if (compressionOption->IsObject()) {
            compression = Nan::ObjectWrap::Unwrap<Compression>(Nan::To<v8::Object>(compressionOption).ToLocalChecked());
        }

        // Set flags for txn used to open database
        Local<Value> create = options->Get(Nan::GetCurrentContext(), Nan::New<String>("create").ToLocalChecked()).ToLocalChecked();
        #if NODE_VERSION_AT_LEAST(12,0,0)
        if (create->IsBoolean() ? !create->BooleanValue(Isolate::GetCurrent()) : true) {
        #else
        if (create->IsBoolean() ? !create->BooleanValue(Nan::GetCurrentContext()).FromJust() : true) {
        #endif
            txnFlags |= MDB_RDONLY;
        }
        Local<Value> hasVersionsLocal = options->Get(Nan::GetCurrentContext(), Nan::New<String>("useVersions").ToLocalChecked()).ToLocalChecked();
        hasVersions = hasVersionsLocal->IsTrue();

        auto txnObj = options->Get(Nan::GetCurrentContext(), Nan::New<String>("txn").ToLocalChecked()).ToLocalChecked();
        if (!txnObj->IsNull() && !txnObj->IsUndefined() && txnObj->IsObject()) {
            TxnWrap *tw = Nan::ObjectWrap::Unwrap<TxnWrap>(Local<Object>::Cast(txnObj));
            needsTransaction = false;
            txn = tw->txn;
        }
        if (options->Get(Nan::GetCurrentContext(), Nan::New<String>("keysUse32LE").ToLocalChecked()).ToLocalChecked()->IsTrue()) {
            keysUse32LE = true;
        }
        if (options->Get(Nan::GetCurrentContext(), Nan::New<String>("valuesUse32LE").ToLocalChecked()).ToLocalChecked()->IsTrue()) {
            valuesUse32LE = true;
        }
    }
    else {
        return Nan::ThrowError("Invalid parameters.");
    }

    if (needsTransaction) {
        // Open transaction
        rc = mdb_txn_begin(ew->env, nullptr, txnFlags, &txn);
        if (rc != 0) {
            // No need to call mdb_txn_abort, because mdb_txn_begin already cleans up after itself
            return throwLmdbError(rc);
        }
    }

    // Open database
    // NOTE: nullptr in place of the name means using the unnamed database.
    #if NODE_VERSION_AT_LEAST(12,0,0)
    rc = mdb_dbi_open(txn, nameIsNull ? nullptr : *String::Utf8Value(Isolate::GetCurrent(), name), flags, &dbi);
    #else
    rc = mdb_dbi_open(txn, nameIsNull ? nullptr : *String::Utf8Value(name), flags, &dbi);
    #endif
    if (rc != 0) {
        if (needsTransaction) {
            mdb_txn_abort(txn);
        }
        return throwLmdbError(rc);
    }
    else {
        isOpen = true;
    }
    // Create wrapper
    DbiWrap* dw = new DbiWrap(ew->env, dbi);
    if (isOpen) {
        dw->ew = ew;
        dw->ew->Ref();
    }
    if (keysUse32LE) {
        dw->keysUse32LE = true;
        mdb_set_compare(txn, dbi, compare32LE);
    }
    if (valuesUse32LE) {
        dw->valuesUse32LE = true;
        mdb_set_dupsort(txn, dbi, compare32LE);
    }
    if (needsTransaction) {
        // Commit transaction
        rc = mdb_txn_commit(txn);
        if (rc != 0) {
            return throwLmdbError(rc);
        }
    }

    dw->keyType = keyType;
    dw->flags = flags;
    dw->isOpen = isOpen;
    if (compression)
        compression->Ref();
    dw->compression = compression;
    dw->hasVersions = hasVersions;
    dw->Wrap(info.This());

    return info.GetReturnValue().Set(info.This());
}

NAN_METHOD(DbiWrap::close) {
    Nan::HandleScope scope;

    DbiWrap *dw = Nan::ObjectWrap::Unwrap<DbiWrap>(info.This());
    if (dw->isOpen) {
        mdb_dbi_close(dw->env, dw->dbi);
        dw->isOpen = false;
        dw->ew->Unref();
        dw->ew = nullptr;
    }
    else {
        return Nan::ThrowError("The Dbi is not open, you can't close it.");
    }
}

class DropWorker : public Nan::AsyncWorker {
  public:
    DropWorker(MDB_dbi dbi, MDB_env* env, int del, Nan::Callback *callback)
      : Nan::AsyncWorker(callback), dbi(dbi), env(env), del(del) {
      }
    void Execute() {
        MDB_txn *txn;
        int rc = mdb_txn_begin(env, nullptr, 0, &txn);
        if (!rc)
            rc = mdb_drop(txn, dbi, del);
        if (rc)
            mdb_txn_abort(txn);
        else
            rc = mdb_txn_commit(txn);
        if (rc)
            SetErrorMessage(mdb_strerror(rc));
    }

    void HandleOKCallback() {
        Nan::HandleScope scope;
        Local<v8::Value> argv[] = {
            Nan::Null()
        };
        callback->Call(1, argv, async_resource);
    }
  private:
    MDB_dbi dbi;
    MDB_env* env;
    int del;
};

NAN_METHOD(DbiWrap::dropAsync) {
    DbiWrap *dw = Nan::ObjectWrap::Unwrap<DbiWrap>(info.This());
    int del = info[0]->IsTrue();
    Nan::Callback* callback = new Nan::Callback(
      Local<v8::Function>::Cast(info[1])
    );
    Nan::AsyncQueueWorker(new DropWorker(dw->dbi, dw->ew->env, del, callback));
}

NAN_METHOD(DbiWrap::drop) {
    Nan::HandleScope scope;

    DbiWrap *dw = Nan::ObjectWrap::Unwrap<DbiWrap>(info.This());
    int del = 1;
    int rc;
    MDB_txn *txn;
    bool needsTransaction = true;
    
    if (!dw->isOpen) {
        return Nan::ThrowError("The Dbi is not open, you can't drop it.");
    }

    // Check if the database should be deleted
    if (info.Length() == 1 && info[0]->IsObject()) {
        Local<Object> options = Local<Object>::Cast(info[0]);
        
        // Just free pages
        Local<Value> opt = options->Get(Nan::GetCurrentContext(), Nan::New<String>("justFreePages").ToLocalChecked()).ToLocalChecked();
        #if NODE_VERSION_AT_LEAST(12,0,0)
        del = opt->IsBoolean() ? !(opt->BooleanValue(Isolate::GetCurrent())) : 1;
        #else
        del = opt->IsBoolean() ? !(opt->BooleanValue(Nan::GetCurrentContext()).FromJust()) : 1;
        #endif
        
        // User-supplied txn
        auto txnObj = options->Get(Nan::GetCurrentContext(), Nan::New<String>("txn").ToLocalChecked()).ToLocalChecked();
        if (!txnObj->IsNull() && !txnObj->IsUndefined() && txnObj->IsObject()) {
            TxnWrap *tw = Nan::ObjectWrap::Unwrap<TxnWrap>(Local<Object>::Cast(txnObj));
            needsTransaction = false;
            txn = tw->txn;
        }
    }

    if (needsTransaction) {
        // Begin transaction
        rc = mdb_txn_begin(dw->env, nullptr, 0, &txn);
        if (rc != 0) {
            return throwLmdbError(rc);
        }
    }

    // Drop database
    rc = mdb_drop(txn, dw->dbi, del);
    if (rc != 0) {
        if (needsTransaction) {
            mdb_txn_abort(txn);
        }
        return throwLmdbError(rc);
    }

    if (needsTransaction) {
        // Commit transaction
        rc = mdb_txn_commit(txn);
        if (rc != 0) {
            return throwLmdbError(rc);
        }
    }
    
    // Only close database if del == 1
    if (del == 1) {
        dw->isOpen = false;
        dw->ew->Unref();
        dw->ew = nullptr;
    }
}

NAN_METHOD(DbiWrap::stat) {
    Nan::HandleScope scope;

    DbiWrap *dw = Nan::ObjectWrap::Unwrap<DbiWrap>(info.This());

    if (info.Length() != 1) {
        return Nan::ThrowError("dbi.stat should be called with a single argument which is a txn.");
    }

    TxnWrap *txn = Nan::ObjectWrap::Unwrap<TxnWrap>(Local<Object>::Cast(info[0]));

    MDB_stat stat;
    mdb_stat(txn->txn, dw->dbi, &stat);

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

#if ENABLE_FAST_API && NODE_VERSION_AT_LEAST(16,6,0)
uint32_t DbiWrap::getByBinaryFast(Local<Object> receiver_obj, uint32_t keySize, FastApiCallbackOptions& options) {
	DbiWrap* dw = static_cast<DbiWrap*>(
        receiver_obj->GetAlignedPointerFromInternalField(0));
    EnvWrap* ew = dw->ew;
    char* keyBuffer = ew->keyBuffer;
    MDB_txn* txn = ew->getReadTxn();
    MDB_val key, data;
    key.mv_size = keySize;
    key.mv_data = (void*) keyBuffer;

    int result = mdb_get(txn, dw->dbi, &key, &data);
    if (result) {
        if (result == MDB_NOTFOUND)
            return 0xffffffff;
        // let the slow handler handle throwing errors
        options.fallback = true;
        return result;
    }
    dw->getFast = true;
    result = getVersionAndUncompress(data, dw);
    if (result)
        result = valToBinaryFast(data);
    if (!result) {
        // this means an allocation or error needs to be thrown, so we fallback to the slow handler
        // or since we are using signed int32 (so we can return error codes), need special handling for above 2GB entries
        options.fallback = true;
    }
    dw->getFast = false;
    /*
    alternately, if we want to send over the address, which can be used for direct access to the LMDB shared memory, but all benchmarking shows it is slower
    *((size_t*) keyBuffer) = data.mv_size;
    *((uint64_t*) (keyBuffer + 8)) = (uint64_t) data.mv_data;
    return 0;*/
    return data.mv_size;
}
#endif

void DbiWrap::getByBinary(
  const v8::FunctionCallbackInfo<v8::Value>& info) {
    v8::Local<v8::Object> instance =
      v8::Local<v8::Object>::Cast(info.Holder());
    DbiWrap* dw = Nan::ObjectWrap::Unwrap<DbiWrap>(instance);
    char* keyBuffer = dw->ew->keyBuffer;
    MDB_txn* txn = dw->ew->getReadTxn();
    MDB_val key;
    MDB_val data;
    key.mv_size = info[0]->Uint32Value(Nan::GetCurrentContext()).FromJust();
    key.mv_data = (void*) keyBuffer;
    int rc = mdb_get(txn, dw->dbi, &key, &data);
    if (rc) {
        if (rc == MDB_NOTFOUND)
            return info.GetReturnValue().Set(Nan::New<Number>(0xffffffff));
        else
            return throwLmdbError(rc);
    }   
    rc = getVersionAndUncompress(data, dw);
    return info.GetReturnValue().Set(valToBinaryUnsafe(data));
}
NAN_METHOD(DbiWrap::getByPrimitive) {
    v8::Local<v8::Object> instance =
      v8::Local<v8::Object>::Cast(info.Holder());
    DbiWrap* dw = Nan::ObjectWrap::Unwrap<DbiWrap>(instance);
    MDB_txn* txn = dw->ew->getReadTxn();
    MDB_val key;
    MDB_val data;
    bool keyIsValid;
    if(argToKey(info[0], key, dw->keyType, keyIsValid)) {
        return Nan::ThrowError("argToKey should not allocate");
    }
    if (!keyIsValid) {
        // argToKey already threw an error
        return;
    }
    int rc = mdb_get(txn, dw->dbi, &key, &data);
    if (rc) {
        if (rc == MDB_NOTFOUND)
            return info.GetReturnValue().Set(Nan::New<Number>(0xffffffff));
        else
            return throwLmdbError(rc);
    }
    rc = getVersionAndUncompress(data, dw);
    return info.GetReturnValue().Set(valToBinaryUnsafe(data));
}

NAN_METHOD(DbiWrap::getStringByPrimitive) {
    v8::Local<v8::Object> instance =
      v8::Local<v8::Object>::Cast(info.Holder());
    DbiWrap* dw = Nan::ObjectWrap::Unwrap<DbiWrap>(instance);
    MDB_txn* txn = dw->ew->getReadTxn();
    MDB_val key;
    MDB_val data;
    bool keyIsValid;
    if(argToKey(info[0], key, dw->keyType, keyIsValid)) {
        return Nan::ThrowError("argToKey should not allocate");
    }
    if (!keyIsValid) {
        // argToKey already threw an error
        return;
    }
    int rc = mdb_get(txn, dw->dbi, &key, &data);
    if (rc) {

        return throwLmdbError(rc);
    }
    rc = getVersionAndUncompress(data, dw);
    return info.GetReturnValue().Set(valToUtf8(data));
}
