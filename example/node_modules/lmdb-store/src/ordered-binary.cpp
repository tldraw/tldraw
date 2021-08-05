#include "node-lmdb.h"
#include <string.h>
#include <stdio.h>

/*
control character types:
1 - metadata
2 - symbols
6 - false
7 - true
8- 16 - negative doubles
16-24 positive doubles
27 - String starts with a character 27 or less or is an empty string
0 - multipart separator
> 27 normal string characters
*/
/*
* Convert arbitrary scalar values to buffer bytes with type preservation and type-appropriate ordering
*/

size_t valueToKey(const Local<Value> &jsKey, uint8_t* targetBytes, size_t remainingBytes, bool inArray, bool throwErrors) {
    size_t bytesWritten;
    if (jsKey->IsString()) {
        int utfWritten = 0;
        Local<String> string = Local<String>::Cast(jsKey);
        #if NODE_VERSION_AT_LEAST(11,0,0)
        bytesWritten = string->WriteUtf8(Isolate::GetCurrent(), (char*) targetBytes, remainingBytes, &utfWritten, v8::String::WriteOptions::NO_NULL_TERMINATION);
        #else
        bytesWritten = string->WriteUtf8((char*) targetBytes, remainingBytes, &utfWritten, v8::String::WriteOptions::NO_NULL_TERMINATION);
        #endif
        if (utfWritten < string->Length()) {
            if (throwErrors)
                Nan::ThrowError("String is too long to fit in a key with a maximum of 1978 bytes");
            return 0;
        }
        if (bytesWritten == 0 || targetBytes[0] < 28) {
            // use string/escape indicator starting byte
            if (remainingBytes == 0) {
                if (throwErrors)
                    Nan::ThrowError("String is too long to fit in a key with a maximum of 1978 bytes");
                return 0;
            }
            memmove(targetBytes + 1, targetBytes, bytesWritten++);
            targetBytes[0] = 27;
        }
        return bytesWritten;
    }

    if (jsKey->IsNumber()
#if NODE_VERSION_AT_LEAST(12,0,0)
        || jsKey->IsBigInt()
#endif
        ) {
        double number;
        if (jsKey->IsNumber())
            number = Local<Number>::Cast(jsKey)->Value();
#if NODE_VERSION_AT_LEAST(12,0,0)
        else {
            bool lossless = true;
            number = (double) Local<BigInt>::Cast(jsKey)->Int64Value(&lossless);
            if (!lossless) {
                if (throwErrors)
                    Nan::ThrowError("BigInt was too large to use as a key.");
                return 0;
            }
        }
#endif
        uint64_t asInt = *((uint64_t*) &number);
        if (number < 0) {
            asInt = asInt ^ 0x7fffffffffffffff;
            targetBytes[0] = (uint8_t) (asInt >> 60);
        } else {
            targetBytes[0] = (uint8_t) (asInt >> 60) | 0x10;
        }
        // TODO: Use byte_swap to do this faster
        targetBytes[1] = (uint8_t) (asInt >> 52) & 0xff;
        targetBytes[2] = (uint8_t) (asInt >> 44) & 0xff;
        targetBytes[3] = (uint8_t) (asInt >> 36) & 0xff;
        targetBytes[4] = (uint8_t) (asInt >> 28) & 0xff;
        targetBytes[5] = (uint8_t) (asInt >> 20) & 0xff;
        targetBytes[6] = (uint8_t) (asInt >> 12) & 0xff;
        targetBytes[7] = (uint8_t) (asInt >> 4) & 0xff;
        targetBytes[8] = (uint8_t) (asInt << 4) & 0xff;
        if (targetBytes[8] == 0 && !inArray) {
            if (targetBytes[6] == 0 && targetBytes[7] == 0) {
                if (targetBytes[5] == 0 && targetBytes[4] == 0)
                        return 4;
                else
                    return 6;
            } else
                return 8;
        } else
            return 9;
       //fprintf(stdout, "asInt %x %x %x %x %x %x %x %x %x\n", targetBytes[0], targetBytes[1], targetBytes[2], targetBytes[3], targetBytes[4], targetBytes[5], targetBytes[6], targetBytes[7], targetBytes[8]);
    } else if (jsKey->IsArray()) {
        Local<Array> array = Local<Array>::Cast(jsKey);
        int length = array->Length();
        Local<Context> context = Nan::GetCurrentContext();
        bytesWritten = 0;
        for (int i = 0; i < length; i++) {
            if (i > 0) {
                if (remainingBytes <= 10) {
                    if (throwErrors)
                        Nan::ThrowError("Array is too large to fit in a key with a maximum of 1978 bytes");
                    return 0;
                }
                *targetBytes = 0;
                targetBytes++;
                bytesWritten++;
                remainingBytes--;
            }
            size_t size = valueToKey(array->Get(context, i).ToLocalChecked(), targetBytes, remainingBytes, true, throwErrors);
            if (!size)
                return 0;
            targetBytes += size;
            bytesWritten += size;
            remainingBytes -= size;
        }
        return bytesWritten;
    } else if (jsKey->IsNull()) {
        targetBytes[0] = 0;
        return 1;
    } else if (jsKey->IsBoolean()) {
        targetBytes[0] = jsKey->IsTrue() ? 7 : 6;
        return 1;
    } else if (jsKey->IsArrayBufferView()) {
        bytesWritten = Local<ArrayBufferView>::Cast(jsKey)->CopyContents(targetBytes, remainingBytes);
        if (bytesWritten > remainingBytes - 10 && // guard the second check with this first check to see if we are close to the end
                Local<ArrayBufferView>::Cast(jsKey)->ByteLength() > bytesWritten) {
            if (throwErrors)
                Nan::ThrowError("Buffer is too long to fit in a key with a maximum of 1978 bytes");
            return 0; // not enough space
        }
        return bytesWritten;
    } else if (jsKey->IsSymbol()) {
        int utfWritten;
#if NODE_VERSION_AT_LEAST(14,0,0)
        Local<String> string = Local<String>::Cast(Local<Symbol>::Cast(jsKey)->Description());
#else
        Local<String> string = Local<String>::Cast(Local<Symbol>::Cast(jsKey)->Name());
#endif

        targetBytes[0] = 2;
#if NODE_VERSION_AT_LEAST(11,0,0)
        bytesWritten = string->WriteUtf8(Isolate::GetCurrent(), (char*) targetBytes + 1, remainingBytes - 1, &utfWritten, v8::String::WriteOptions::NO_NULL_TERMINATION) + 1;
#else
        bytesWritten = string->WriteUtf8((char*) targetBytes + 1, remainingBytes - 1, &utfWritten, v8::String::WriteOptions::NO_NULL_TERMINATION) + 1;
#endif
        if (utfWritten < string->Length()) {
            Nan::ThrowError("Symbol name is too long to fit in a key with a maximum of 1978 bytes");
            return 0;
        }
        return bytesWritten;
    } else {
        if (throwErrors)
            Nan::ThrowError("Invalid type for key.");
        return 0;
    }
}

bool valueToMDBKey(const Local<Value>& jsKey, MDB_val& mdbKey, KeySpace& keySpace) {
    if (jsKey->IsArrayBufferView()) {
        // special case where we can directly use this
        mdbKey.mv_data = node::Buffer::Data(jsKey);
        mdbKey.mv_size = Local<ArrayBufferView>::Cast(jsKey)->ByteLength();
        return true;
    }
    uint8_t* targetBytes = keySpace.getTarget();
    size_t size = mdbKey.mv_size = valueToKey(jsKey, targetBytes, MDB_MAXKEYSIZE, false, keySpace.fixedSize);
    mdbKey.mv_data = targetBytes;
    if (!keySpace.fixedSize)
        keySpace.position += size;
    return size;
}

Local<Value> MDBKeyToValue(MDB_val &val) {
    Local<Value> value;
    int consumed = 0;
    uint8_t* keyBytes = (uint8_t*) val.mv_data;
    int size = val.mv_size;
    if (size < 1) {
        return Nan::Null();
    }
    uint8_t controlByte = keyBytes[0];
    if (controlByte < 24) {
        if (controlByte < 8) {
            consumed = 1;
            if (controlByte == 6) {
                value = Nan::New<Boolean>(false);
            } else if (controlByte == 7) {
                value = Nan::New<Boolean>(true);
            } else if (controlByte == 0) {
                value = Nan::Null();
            } else if (controlByte == 2) {
                consumed = size;
                uint8_t* separatorPosition = (uint8_t*) memchr((char*) keyBytes + 1, 0, size - 1);
                if (separatorPosition) {
                    value = Symbol::For(Isolate::GetCurrent(), Nan::New<v8::String>((char*) keyBytes + 1, separatorPosition - keyBytes - 1).ToLocalChecked());
                    consumed = separatorPosition - keyBytes;
                } else {
                    value = Symbol::For(Isolate::GetCurrent(), Nan::New<v8::String>((char*) keyBytes + 1, size - 1).ToLocalChecked());
                    consumed = size;
                }
            } else {
                return Nan::CopyBuffer(
                    (char*)val.mv_data,
                    val.mv_size
                ).ToLocalChecked();
            }
        } else {
            uint64_t asInt = ((uint64_t) keyBytes[0] << 60) | ((uint64_t) keyBytes[1] << 52) | ((uint64_t) keyBytes[2] << 44) | ((uint64_t) keyBytes[3] << 36);
            if (size > 4) {
                asInt |= ((uint64_t) keyBytes[4] << 28) | ((uint64_t) keyBytes[5] << 20);
                if (size > 6) {
                    asInt |= ((uint64_t) keyBytes[6] << 12) | ((uint64_t) keyBytes[7] << 4);
                    if (size > 8) {
                        asInt |= (uint64_t) keyBytes[8] >> 4;
                    }
                }
            }
            if (controlByte < 16)
                asInt = asInt ^ 0x7fffffffffffffff;
//           fprintf(stdout, "asInt %x %x \n",asInt, asInt >> 32);

            value = Nan::New<Number>(*((double*) &asInt));
            consumed = 9;
        }
    } else {
        consumed = val.mv_size;
        bool isOneByte = true;
        int8_t* position = ((int8_t*) val.mv_data);
        int8_t* end = position + consumed;
        if (*position == 27) {
            position++; // skip string escape byte
            consumed--;
            val.mv_data = (char*) val.mv_data + 1;
        }
        for (; position < end; position++) {
            if (*position < 1) { // by using signed chars, non-latin is negative and separators are less than 1
                int8_t c = *position;
                if (c < 0) {
                    isOneByte = false;
                } else { // 0, separator
                    consumed = position - ((int8_t*) val.mv_data);
                    break;
                }
            }
        }
        if (isOneByte)
            value = v8::String::NewFromOneByte(Isolate::GetCurrent(), (uint8_t*) val.mv_data, v8::NewStringType::kNormal, consumed).ToLocalChecked();
        else
            value = Nan::New<v8::String>((char*) val.mv_data, consumed).ToLocalChecked();
    }
    if (consumed < size) {
        Local<Value> nextValue;
        if (keyBytes[consumed] != 0 && keyBytes[consumed] != 30) {
            nextValue = Nan::New<v8::String>("Invalid separator byte").ToLocalChecked();
        } else {
            MDB_val nextPart;
            nextPart.mv_size = size - consumed - 1;
            nextPart.mv_data = &keyBytes[consumed + 1];
            nextValue = MDBKeyToValue(nextPart);
        }
        v8::Local<v8::Array> resultsArray;
        Local<Context> context = Nan::GetCurrentContext();
        if (nextValue->IsArray()) {
            v8::Local<v8::Array> nextArray = Local<Array>::Cast(nextValue);
            int length = nextArray->Length();
            resultsArray = Nan::New<v8::Array>(1 + length);
            for (int i = 0; i < length; i++) {
                (void)resultsArray->Set(context, i + 1, nextArray->Get(context, i).ToLocalChecked());
            }
        } else {
            resultsArray = Nan::New<v8::Array>(2);
            (void)resultsArray->Set(context, 1, nextValue);
        }
        (void)resultsArray->Set(context, 0, value);
        value = resultsArray;
    }
    return value;
}

NAN_METHOD(bufferToKeyValue) {
    if (!node::Buffer::HasInstance(info[0])) {
        Nan::ThrowError("Invalid key. Should be a Buffer.");
        return;
    }
    MDB_val key;
    key.mv_size = node::Buffer::Length(info[0]);
    key.mv_data = node::Buffer::Data(info[0]);
    info.GetReturnValue().Set(MDBKeyToValue(key));
}
NAN_METHOD(keyValueToBuffer) {
    uint8_t* targetBytes = getFixedKeySpace()->getTarget();
    size_t size = valueToKey(info[0], targetBytes, MDB_MAXKEYSIZE, false, true);
    if (!size) {
        return;
    }
    Nan::MaybeLocal<v8::Object> buffer = Nan::CopyBuffer(
            (char*)targetBytes,
            size);
    info.GetReturnValue().Set(buffer.ToLocalChecked());
}


KeySpaceHolder::KeySpaceHolder() {
    previousSpace = nullptr;
}
KeySpaceHolder::KeySpaceHolder(KeySpaceHolder* existingSpace, uint8_t* existingData) {
    previousSpace = existingSpace;
    data = existingData;
}
KeySpaceHolder::~KeySpaceHolder() {
    if (previousSpace)
        delete previousSpace;
    delete[] data;
}

uint8_t* KeySpace::getTarget() {
    if (position + MDB_MAXKEYSIZE > size) {
        if (fixedSize) {
            Nan::ThrowError("Key is too large");
            return nullptr;
        } else {
            previousSpace = new KeySpaceHolder(previousSpace, data);
            size = size << 1; // grow on each expansion
            data = new uint8_t[size];
        }
    }
    return &data[position];
}
KeySpace::KeySpace(bool fixed) {
    fixedSize = fixed;
    position = 0;
    size = fixed ? MDB_MAXKEYSIZE + 8 : 8192;
    data = new uint8_t[size];
}
#ifdef _WIN32
#define ntohl _byteswap_ulong
#define htonl _byteswap_ulong
#endif

void load32LE(MDB_val &val, uint32_t* target) {
    // copy and swap at the same time, and guarantee null termination
    uint32_t* source = (uint32_t*) val.mv_data;
    unsigned int size = val.mv_size;
    uint32_t* end = source + (size >> 2);
    for (; source < end; source++) {
        *target = ntohl(*source);
        target++;
    }
    *target = ntohl(*source << (32 - ((size & 3) << 3)));
}


void make32LE(MDB_val &val) {
/*
    uint8_t* bytes = (uint8_t*) val.mv_data;
    unsigned int size = val.mv_size;
    if (val.mv_size & 1) {
        if (bytes[size - 1] == 0)
            val.mv_size = --size;
        else
            return;
    }
    size = size >> 1;
    if (((uint16_t*)bytes)[size - 1] == 0) {
        if (((uint16_t*)bytes)[size - 2] == 0)
            val.mv_size -= 4;
        else
            val.mv_size -= 2;
    }
*/ 
    uint32_t* buffer = (uint32_t*) val.mv_data;
    unsigned int size = val.mv_size;
    uint32_t* end = buffer + (size >> 3);
    for (; buffer < end; buffer++) {
        *buffer = htonl(*buffer);
    }
    *buffer = htonl(*buffer << (32 - ((size & 3) << 3)));
}
// compare items by 32-bit LE comparison
int compare32LE(const MDB_val *a, const MDB_val *b) {
    uint32_t* dataA = (uint32_t*) a->mv_data;
    uint32_t* dataB = (uint32_t*) b->mv_data;
    uint32_t sizeA = a->mv_size;
    uint32_t sizeB = b->mv_size;
    uint32_t minSize = (sizeA > sizeB ? sizeB : sizeA);
    uint32_t wordA;
    uint32_t wordB;
    for (int i = minSize >> 2; i > 0; i--) {
        wordA = *dataA++;
        wordB = *dataB++;
        if (wordA > wordB)
            return 1;
        if (wordA < wordB)
            return -1;
    }
    if (minSize & 0x3) {
        sizeA -= minSize;
        sizeB -= minSize;
        wordA = sizeA < 4 ? *dataA << ((4 - sizeA) << 3) : *dataA;
        wordB = sizeB < 4 ? *dataB << ((4 - sizeB) << 3) : *dataB;
        if (wordA > wordB)
            return 1;
        if (wordA < wordB)
            return -1;
    }
    return sizeA - sizeB;
}
