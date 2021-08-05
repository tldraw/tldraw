
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
#include <string.h>

using namespace v8;
using namespace node;

CursorWrap::CursorWrap(MDB_cursor *cursor) {
    this->cursor = cursor;
    this->keyType = NodeLmdbKeyType::StringKey;
    this->freeKey = nullptr;
    this->endKey.mv_size = 0; // indicates no end key (yet)
}

CursorWrap::~CursorWrap() {
    if (this->cursor) {
        this->dw->Unref();
        this->tw->Unref();
        // Don't close cursor here, it is possible that the environment may already be closed, which causes it to crash
        //mdb_cursor_close(this->cursor);
    }
    if (this->freeKey) {
        this->freeKey(this->key);
    }
}

NAN_METHOD(CursorWrap::ctor) {
    Nan::HandleScope scope;

    if (info.Length() < 2) {
      return Nan::ThrowError("Wrong number of arguments");
    }

    // Extra pessimism...
    Nan::MaybeLocal<v8::Object> arg0 = Nan::To<v8::Object>(info[0]);
    Nan::MaybeLocal<v8::Object> arg1 = Nan::To<v8::Object>(info[1]);
    if (arg0.IsEmpty() || arg1.IsEmpty()) {
        return Nan::ThrowError("Invalid arguments to the Cursor constructor. First must be a Txn, second must be a Dbi.");
    }

    // Unwrap Txn and Dbi
    TxnWrap *tw = Nan::ObjectWrap::Unwrap<TxnWrap>(arg0.ToLocalChecked());
    DbiWrap *dw = Nan::ObjectWrap::Unwrap<DbiWrap>(arg1.ToLocalChecked());

    // Get key type
    auto keyType = keyTypeFromOptions(info[2], dw->keyType);
    if (dw->keyType == NodeLmdbKeyType::Uint32Key && keyType != NodeLmdbKeyType::Uint32Key) {
        return Nan::ThrowError("You specified keyIsUint32 on the Dbi, so you can't use other key types with it.");
    }

    // Open the cursor
    MDB_cursor *cursor;
    int rc = mdb_cursor_open(tw->txn, dw->dbi, &cursor);
    if (rc != 0) {
        return throwLmdbError(rc);
    }

    // Create wrapper
    CursorWrap* cw = new CursorWrap(cursor);
    cw->dw = dw;
    cw->dw->Ref();
    cw->tw = tw;
    cw->tw->Ref();
    cw->keyType = keyType;
    cw->Wrap(info.This());

    return info.GetReturnValue().Set(info.This());
}

NAN_METHOD(CursorWrap::close) {
    Nan::HandleScope scope;

    CursorWrap *cw = Nan::ObjectWrap::Unwrap<CursorWrap>(info.This());
    if (!cw->cursor) {
      return Nan::ThrowError("cursor.close: Attempt to close a closed cursor!");
    }
    mdb_cursor_close(cw->cursor);
    cw->dw->Unref();
    cw->tw->Unref();
    cw->cursor = nullptr;
}

NAN_METHOD(CursorWrap::del) {
    Nan::HandleScope scope;

    if (info.Length() != 0 && info.Length() != 1) {
        return Nan::ThrowError("cursor.del: Incorrect number of arguments provided, arguments: options (optional).");
    }

    int flags = 0;

    if (info.Length() == 1) {
        if (!info[0]->IsObject()) {
            return Nan::ThrowError("cursor.del: Invalid options argument. It should be an object.");
        }
        
        auto options = Nan::To<v8::Object>(info[0]).ToLocalChecked();
        setFlagFromValue(&flags, MDB_NODUPDATA, "noDupData", false, options);
    }

    CursorWrap *cw = Nan::ObjectWrap::Unwrap<CursorWrap>(info.This());

    int rc = mdb_cursor_del(cw->cursor, flags);
    if (rc != 0) {
        return throwLmdbError(rc);
    }
}

Nan::NAN_METHOD_RETURN_TYPE CursorWrap::getCommon(
    Nan::NAN_METHOD_ARGS_TYPE info,
    MDB_cursor_op op,
    argtokey_callback_t (*setKey)(CursorWrap* cw, Nan::NAN_METHOD_ARGS_TYPE info, MDB_val&, bool&),
    void (*setData)(CursorWrap* cw, Nan::NAN_METHOD_ARGS_TYPE info, MDB_val&),
    void (*freeData)(CursorWrap* cw, Nan::NAN_METHOD_ARGS_TYPE info, MDB_val&),
    Local<Value> (*convertFunc)(MDB_val &data)
) {
    Nan::HandleScope scope;

    int al = info.Length();
    CursorWrap *cw = Nan::ObjectWrap::Unwrap<CursorWrap>(info.This());

    // When a new key is manually set
    if (setKey) {
        // Free old key if necessary
        if (cw->freeKey) {
            cw->freeKey(cw->key);
            cw->freeKey = nullptr;
        }

        // Set new key and assign the deleter function
        bool keyIsValid;
        cw->freeKey = setKey(cw, info, cw->key, keyIsValid);
        if (!keyIsValid) {
            // setKey already threw an error, no need to throw here
            return;
        }
    }

    // When data is manually set
    if (setData) {
        setData(cw, info, cw->data);
    }

    // Temporary thing, so that we can free up the data if we want to
    MDB_val tempdata;
    tempdata.mv_size = cw->data.mv_size;
    tempdata.mv_data = cw->data.mv_data;

    // Temporary bookkeeping for the current key
    MDB_val tempKey;
    tempKey.mv_size = cw->key.mv_size;
    tempKey.mv_data = cw->key.mv_data;

    // Call LMDB
    int rc = mdb_cursor_get(cw->cursor, &(cw->key), &(cw->data), op);

    // Check if key points inside LMDB
    if (tempKey.mv_data != cw->key.mv_data) {
        // cw->key points inside the database now,
        // so we should free the old key now.
        if (cw->freeKey) {
            cw->freeKey(tempKey);
            cw->freeKey = nullptr;
        }
    }

    if (rc == MDB_NOTFOUND) {
        return info.GetReturnValue().Set(Nan::Undefined());
    }
    else if (rc != 0) {
        return throwLmdbError(rc);
    }


    Local<Value> dataHandle = Nan::Undefined();
    if (convertFunc) {
    //    fprintf(stdout, "getVersionAndUncompress\n");

        getVersionAndUncompress(cw->data, cw->dw);
        dataHandle = convertFunc(cw->data);

        if (al > 0) {
            const auto &callbackFunc = info[al - 1];

            if (callbackFunc->IsFunction()) {
                // In this case, we expect the key/data pair to be correctly filled
                constexpr const unsigned argc = 2;
                Local<Value> keyHandle = Nan::Undefined();
                if (cw->key.mv_size) {
            //        fprintf(stdout, "cw->key.mv_size %u\n", cw->key.mv_size);
              //      fprintf(stdout, "cw->key.mv_data %X %X %X\n", ((char*)cw->key.mv_data)[0], ((char*)cw->key.mv_data)[1], ((char*)cw->key.mv_data)[2]);
                    keyHandle = keyToHandle(cw->key, cw->keyType);
                }
                Local<Value> argv[argc] = { keyHandle, dataHandle };
                
                Nan::Call(Nan::Callback(Local<Function>::Cast(callbackFunc)), argc, argv);
            }
        }
    }
    //fprintf(stdout, "freeData");

    if (freeData) {
        freeData(cw, info, tempdata);
    }

    if (convertFunc) {
        return info.GetReturnValue().Set(dataHandle);
    }
    else if (cw->key.mv_size) {
        return info.GetReturnValue().Set(keyToHandle(cw->key, cw->keyType));
    }

    return info.GetReturnValue().Set(Nan::True());
}

Nan::NAN_METHOD_RETURN_TYPE CursorWrap::getCommon(Nan::NAN_METHOD_ARGS_TYPE info, MDB_cursor_op op) {
    return getCommon(info, op, nullptr, nullptr, nullptr, nullptr);
}

NAN_METHOD(CursorWrap::getCurrentString) {
    return getCommon(info, MDB_GET_CURRENT, nullptr, nullptr, nullptr, valToString);
}

NAN_METHOD(CursorWrap::getCurrentStringUnsafe) {
    return getCommon(info, MDB_GET_CURRENT, nullptr, nullptr, nullptr, valToStringUnsafe);
}

NAN_METHOD(CursorWrap::getCurrentUtf8) {
    return getCommon(info, MDB_GET_CURRENT, nullptr, nullptr, nullptr, valToUtf8);
}

NAN_METHOD(CursorWrap::getCurrentBinary) {
    return getCommon(info, MDB_GET_CURRENT, nullptr, nullptr, nullptr, valToBinary);
}

NAN_METHOD(CursorWrap::getCurrentBinaryUnsafe) {
    return getCommon(info, MDB_GET_CURRENT, nullptr, nullptr, nullptr, valToBinaryUnsafe);
}

NAN_METHOD(CursorWrap::getCurrentNumber) {
    return getCommon(info, MDB_GET_CURRENT, nullptr, nullptr, nullptr, valToNumber);
}

NAN_METHOD(CursorWrap::getCurrentBoolean) {
    return getCommon(info, MDB_GET_CURRENT, nullptr, nullptr, nullptr, valToBoolean);
}

NAN_METHOD(CursorWrap::getCurrentIsDatabase) {
    #ifdef MDB_RPAGE_CACHE
    CursorWrap* cw = Nan::ObjectWrap::Unwrap<CursorWrap>(info.This());
    int isDatabase = mdb_cursor_is_db(cw->cursor);
    return info.GetReturnValue().Set(Nan::New<Boolean>(isDatabase));
    #endif
}

#define MAKE_GET_FUNC(name, op) NAN_METHOD(CursorWrap::name) { return getCommon(info, op); }

MAKE_GET_FUNC(goToFirst, MDB_FIRST);

MAKE_GET_FUNC(goToLast, MDB_LAST);

MAKE_GET_FUNC(goToNext, MDB_NEXT);

MAKE_GET_FUNC(goToPrev, MDB_PREV);

MAKE_GET_FUNC(goToFirstDup, MDB_FIRST_DUP);

MAKE_GET_FUNC(goToLastDup, MDB_LAST_DUP);

MAKE_GET_FUNC(goToNextDup, MDB_NEXT_DUP);

MAKE_GET_FUNC(goToPrevDup, MDB_PREV_DUP);

MAKE_GET_FUNC(goToNextNoDup, MDB_NEXT_NODUP);

MAKE_GET_FUNC(goToPrevNoDup, MDB_PREV_NODUP);

static void fillDataFromArg1(CursorWrap* cw, Nan::NAN_METHOD_ARGS_TYPE info, MDB_val &data) {
    if (info[1]->IsString()) {
        CustomExternalStringResource::writeTo(Local<String>::Cast(info[1]), &data);
    }
    else if (node::Buffer::HasInstance(info[1])) {
        data.mv_size = node::Buffer::Length(info[1]);
        data.mv_data = node::Buffer::Data(info[1]);
    }
    else if (info[1]->IsNumber()) {
        data.mv_size = sizeof(double);
        data.mv_data = new double;
        auto local = Nan::To<v8::Number>(info[1]).ToLocalChecked();
        *((double*)data.mv_data) = local->Value();
    }
    else if (info[1]->IsBoolean()) {
        data.mv_size = sizeof(double);
        data.mv_data = new bool;
        auto local = Nan::To<v8::Boolean>(info[1]).ToLocalChecked();
        *((bool*)data.mv_data) = local->Value();
    }
    else {
        Nan::ThrowError("Invalid data type.");
    }
}

static void freeDataFromArg1(CursorWrap* cw, Nan::NAN_METHOD_ARGS_TYPE info, MDB_val &data) {
    if (info[1]->IsString()) {
        delete[] (uint16_t*)data.mv_data;
    }
    else if (node::Buffer::HasInstance(info[1])) {
        // I think the data is owned by the node::Buffer so we don't need to free it - need to clarify
    }
    else if (info[1]->IsNumber()) {
        delete (double*)data.mv_data;
    }
    else if (info[1]->IsBoolean()) {
        delete (bool*)data.mv_data;
    }
    else {
        Nan::ThrowError("Invalid data type.");
    }
}

template<size_t keyIndex, size_t optionsIndex>
inline argtokey_callback_t cursorArgToKey(CursorWrap* cw, Nan::NAN_METHOD_ARGS_TYPE info, MDB_val &key, bool &keyIsValid) {
    auto keyType = keyTypeFromOptions(info[optionsIndex], cw->keyType);
    return argToKey(info[keyIndex], key, keyType, keyIsValid);
}

NAN_METHOD(CursorWrap::goToKey) {
    if (info.Length() != 1 && info.Length() != 2) {
        return Nan::ThrowError("You called cursor.goToKey with an incorrect number of arguments. Arguments are: key (mandatory), options (optional).");
    }
    return getCommon(info, MDB_SET_KEY, cursorArgToKey<0, 1>, nullptr, nullptr, nullptr);
}

NAN_METHOD(CursorWrap::goToRange) {
    if (info.Length() != 1 && info.Length() != 2) {
        return Nan::ThrowError("You called cursor.goToRange with an incorrect number of arguments. Arguments are: key (mandatory), options (optional).");
    }
    return getCommon(info, MDB_SET_RANGE, cursorArgToKey<0, 1>, nullptr, nullptr, nullptr);
}

NAN_METHOD(CursorWrap::goToDup) {
    if (info.Length() != 2 && info.Length() != 3) {
        return Nan::ThrowError("You called cursor.goToDup with an incorrect number of arguments. Arguments are: key (mandatory), data (mandatory), options (optional).");
    }
    return getCommon(info, MDB_GET_BOTH, cursorArgToKey<0, 2>, fillDataFromArg1, freeDataFromArg1, nullptr);
}

NAN_METHOD(CursorWrap::goToDupRange) {
    if (info.Length() != 2 && info.Length() != 3) {
        return Nan::ThrowError("You called cursor.goToDupRange with an incorrect number of arguments. Arguments are: key (mandatory), data (mandatory), options (optional).");
    }
    return getCommon(info, MDB_GET_BOTH_RANGE, cursorArgToKey<0, 2>, fillDataFromArg1, freeDataFromArg1, nullptr);
}
int CursorWrap::returnEntry(int lastRC, MDB_val &key, MDB_val &data) {
    if (lastRC) {
        if (lastRC == MDB_NOTFOUND)
            return 0;
        else {
            throwLmdbError(lastRC);
            return 0;
        }
    }   
    if (endKey.mv_size > 0) {
        int comparison;
        if (flags & 0x800)
            comparison = mdb_dcmp(tw->txn, dw->dbi, &endKey, &data);
        else
            comparison = mdb_cmp(tw->txn, dw->dbi, &endKey, &key);
        if ((flags & 0x400) ? comparison >= 0 : (comparison <= 0)) {
            return 0;
        }
    }
	char* keyBuffer = dw->ew->keyBuffer;
	if (flags & 0x100) {
        bool result = getVersionAndUncompress(data, dw);
        if (result)
            result = valToBinaryFast(data);
        if (!result)
            dw->getFast = false;
		*((size_t*)keyBuffer) = data.mv_size;
	}
	if (!(flags & 0x800))
        memcpy(keyBuffer + 32, key.mv_data, key.mv_size);

    return key.mv_size;
}

uint32_t CursorWrap::doPosition(uint32_t offset, uint32_t keySize, uint64_t endKeyAddress) {
    //char* keyBuffer = dw->ew->keyBuffer;
    MDB_val key, data;
    int rc;
    if (flags & 0x2000) // TODO: check the txn_id to determine if we need to renew
        mdb_cursor_renew(mdb_cursor_txn(cursor), cursor);
    if (endKeyAddress) {
        uint32_t* keyBuffer = (uint32_t*) endKeyAddress;
        endKey.mv_size = *keyBuffer;
        endKey.mv_data = (char*)(keyBuffer + 1);
    } else
        endKey.mv_size = 0;
    iteratingOp = (flags & 0x400) ?
        (flags & 0x100) ?
            (flags & 0x800) ? MDB_PREV_DUP : MDB_PREV :
            MDB_PREV_NODUP :
        (flags & 0x100) ?
            (flags & 0x800) ? MDB_NEXT_DUP : MDB_NEXT :
            MDB_NEXT_NODUP;
    key.mv_size = keySize;
    key.mv_data = dw->ew->keyBuffer;
    if (key.mv_size == 0) {
        rc = mdb_cursor_get(cursor, &key, &data, flags & 0x400 ? MDB_LAST : MDB_FIRST);  
    } else {
        if (flags & 0x800) { // only values for this key
            // take the next part of the key buffer as a pointer to starting data
            uint32_t* startValueBuffer = (uint32_t*)(*(uint64_t*)(dw->ew->keyBuffer + 2000));
            data.mv_size = endKeyAddress ? *((uint32_t*)startValueBuffer) : 0;
            data.mv_data = startValueBuffer + 1;
            rc = mdb_cursor_get(cursor, &key, &data, data.mv_size ? MDB_GET_BOTH_RANGE : MDB_SET_KEY);
            if (rc == MDB_NOTFOUND)
                return 0;
            if (flags & 0x1000 && !endKeyAddress) {
                size_t count;
                rc = mdb_cursor_count(cursor, &count);
                if (rc)
                    throwLmdbError(rc);
                return count;
            }
            if (flags & 0x400) // reverse, get last dup
                rc = mdb_cursor_get(cursor, &key, &data, MDB_LAST_DUP);
        } else {
            if (flags & 0x400) {// reverse
                MDB_val firstKey = key; // save it for comparison
                rc = mdb_cursor_get(cursor, &key, &data, MDB_SET_RANGE);
                if (rc)
                    rc = mdb_cursor_get(cursor, &key, &data, MDB_LAST);
                else if (mdb_cmp(tw->txn, dw->dbi, &firstKey, &key)) // the range found the next entry *after* the start
                    rc = mdb_cursor_get(cursor, &key, &data, MDB_PREV);
            } else // forward, just do a get by range
                rc = mdb_cursor_get(cursor, &key, &data, MDB_SET_RANGE);
        }
    }
    while (offset-- > 0 && !rc) {
        rc = mdb_cursor_get(cursor, &key, &data, iteratingOp);
    }
    if (flags & 0x1000) {
        uint32_t count = 0;
        bool useCursorCount = false;
        // if we are in a dupsort database, and we are iterating over all entries, we can just count all the values for each key
        if (dw->flags & MDB_DUPSORT) {
            if (iteratingOp == MDB_PREV) {
                iteratingOp = MDB_PREV_NODUP;
                useCursorCount = true;
            }
            if (iteratingOp == MDB_NEXT) {
                iteratingOp = MDB_NEXT_NODUP;
                useCursorCount = true;
            }
        }

        while (!rc) {
            if (endKey.mv_size > 0) {
                int comparison;
                if (flags & 0x800)
                    comparison = mdb_dcmp(tw->txn, dw->dbi, &endKey, &data);
                else
                    comparison = mdb_cmp(tw->txn, dw->dbi, &endKey, &key);
                if ((flags & 0x400) ? comparison >= 0 : (comparison <=0)) {
                    return count;
                }
            }
            if (useCursorCount) {
                size_t countForKey;
                rc = mdb_cursor_count(cursor, &countForKey);
                if (rc)
                    throwLmdbError(rc);
                count += countForKey;
            } else
                count++;
            rc = mdb_cursor_get(cursor, &key, &data, iteratingOp);
        }
        return count;
    }
    // TODO: Handle count?
    return returnEntry(rc, key, data);
}
#if ENABLE_FAST_API && NODE_VERSION_AT_LEAST(16,6,0)
uint32_t CursorWrap::positionFast(Local<Object> receiver_obj, uint32_t flags, uint32_t offset, uint32_t keySize, uint64_t endKeyAddress, FastApiCallbackOptions& options) {
    CursorWrap* cw = static_cast<CursorWrap*>(
        receiver_obj->GetAlignedPointerFromInternalField(0));
    DbiWrap* dw = cw->dw;
    dw->getFast = true;
    cw->flags = flags;
    uint32_t result = cw->doPosition(offset, keySize, endKeyAddress);
    if (dw->getFast)
        dw->getFast = false;
    else
        options.fallback = true;
    return result;
}
#endif
void CursorWrap::position(
  const v8::FunctionCallbackInfo<v8::Value>& info) {
    v8::Local<v8::Object> instance =
      v8::Local<v8::Object>::Cast(info.Holder());
    CursorWrap* cw = Nan::ObjectWrap::Unwrap<CursorWrap>(instance);
    cw->flags = info[0]->Uint32Value(Nan::GetCurrentContext()).FromJust();
    uint32_t offset = info[1]->Uint32Value(Nan::GetCurrentContext()).FromJust();
    uint32_t keySize = info[2]->IntegerValue(Nan::GetCurrentContext()).FromJust();
    uint64_t endKeyAddress = info[3]->IntegerValue(Nan::GetCurrentContext()).FromJust();
    uint32_t result = cw->doPosition(offset, keySize, endKeyAddress);
    info.GetReturnValue().Set(Nan::New<Number>(result));
}
#ifdef ENABLE_FAST_API
uint32_t CursorWrap::iterateFast(Local<Object> receiver_obj, FastApiCallbackOptions& options) {
    CursorWrap* cw = static_cast<CursorWrap*>(
        receiver_obj->GetAlignedPointerFromInternalField(0));
    DbiWrap* dw = cw->dw;
    dw->getFast = true;
    MDB_val key, data;
    int rc = mdb_cursor_get(cw->cursor, &key, &data, cw->iteratingOp);
    uint32_t result = cw->returnEntry(rc, key, data);
    if (dw->getFast)
        dw->getFast = false;
    else
        options.fallback = true;
    return result;
}
#endif
void CursorWrap::iterate(
  const v8::FunctionCallbackInfo<v8::Value>& info) {
    v8::Local<v8::Object> instance =
      v8::Local<v8::Object>::Cast(info.Holder());
    CursorWrap* cw = Nan::ObjectWrap::Unwrap<CursorWrap>(instance);
    MDB_val key, data;
    int rc = mdb_cursor_get(cw->cursor, &key, &data, cw->iteratingOp);
    return info.GetReturnValue().Set(Nan::New<Number>(cw->returnEntry(rc, key, data)));
}

NAN_METHOD(CursorWrap::renew) {
    CursorWrap* cw = Nan::ObjectWrap::Unwrap<CursorWrap>(info.Holder());
    // Unwrap Txn and Dbi
    TxnWrap *tw = Nan::ObjectWrap::Unwrap<TxnWrap>(v8::Local<v8::Object>::Cast(info[0]));
    cw->tw->Unref(); // no longer using the previous transaction
    cw->tw = tw;
    cw->tw->Ref(); // now we are using this one
    int rc = mdb_cursor_renew(tw->txn, cw->cursor);
    if (rc != 0) {
        return throwLmdbError(rc);
    }
}

void CursorWrap::setupExports(Local<Object> exports) {
    // CursorWrap: Prepare constructor template
    Local<FunctionTemplate> cursorTpl = Nan::New<FunctionTemplate>(CursorWrap::ctor);
    cursorTpl->SetClassName(Nan::New<String>("Cursor").ToLocalChecked());
    cursorTpl->InstanceTemplate()->SetInternalFieldCount(1);
    // CursorWrap: Add functions to the prototype
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("close").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::close));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("getCurrentString").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::getCurrentString));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("getCurrentStringUnsafe").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::getCurrentStringUnsafe));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("getCurrentUtf8").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::getCurrentUtf8));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("getCurrentBinary").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::getCurrentBinary));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("getCurrentBinaryUnsafe").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::getCurrentBinaryUnsafe));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("getCurrentNumber").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::getCurrentNumber));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("getCurrentBoolean").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::getCurrentBoolean));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("getCurrentIsDatabase").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::getCurrentIsDatabase));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("goToFirst").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::goToFirst));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("goToLast").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::goToLast));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("goToNext").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::goToNext));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("goToPrev").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::goToPrev));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("goToKey").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::goToKey));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("goToRange").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::goToRange));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("goToFirstDup").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::goToFirstDup));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("goToLastDup").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::goToLastDup));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("goToNextDup").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::goToNextDup));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("goToPrevDup").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::goToPrevDup));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("goToNextNoDup").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::goToNextNoDup));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("goToPrevNoDup").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::goToPrevNoDup));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("goToDup").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::goToDup));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("goToDupRange").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::goToDupRange));
    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("del").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::del));

    Isolate *isolate = Isolate::GetCurrent();
    #ifdef ENABLE_FAST_API
    auto positionFast = CFunction::Make(CursorWrap::positionFast);
    cursorTpl->PrototypeTemplate()->Set(isolate, "position", v8::FunctionTemplate::New(
          isolate, CursorWrap::position, v8::Local<v8::Value>(),
          v8::Local<v8::Signature>(), 0, v8::ConstructorBehavior::kThrow,
          v8::SideEffectType::kHasNoSideEffect, &positionFast));

    auto iterateFast = CFunction::Make(CursorWrap::iterateFast);
    cursorTpl->PrototypeTemplate()->Set(isolate, "iterate", v8::FunctionTemplate::New(
          isolate, CursorWrap::iterate, v8::Local<v8::Value>(),
          v8::Local<v8::Signature>(), 0, v8::ConstructorBehavior::kThrow,
          v8::SideEffectType::kHasNoSideEffect, &iterateFast));
    #else
    cursorTpl->PrototypeTemplate()->Set(isolate, "position", v8::FunctionTemplate::New(
          isolate, CursorWrap::position, v8::Local<v8::Value>(),
          v8::Local<v8::Signature>(), 0, v8::ConstructorBehavior::kThrow,
          v8::SideEffectType::kHasNoSideEffect));

    cursorTpl->PrototypeTemplate()->Set(isolate, "iterate", v8::FunctionTemplate::New(
          isolate, CursorWrap::iterate, v8::Local<v8::Value>(),
          v8::Local<v8::Signature>(), 0, v8::ConstructorBehavior::kThrow,
          v8::SideEffectType::kHasNoSideEffect));
    #endif

    cursorTpl->PrototypeTemplate()->Set(Nan::New<String>("renew").ToLocalChecked(), Nan::New<FunctionTemplate>(CursorWrap::renew));

    // Set exports
    (void)exports->Set(Nan::GetCurrentContext(), Nan::New<String>("Cursor").ToLocalChecked(), cursorTpl->GetFunction(Nan::GetCurrentContext()).ToLocalChecked());
}
