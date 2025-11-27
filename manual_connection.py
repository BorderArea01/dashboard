import requests
import json
import time
import hmac
import hashlib
import base64
import random
from urllib.parse import quote

# ================= 配置信息 =================
SERVER_URL = "http://39.108.116.74/K3Cloud"
ACCT_ID = "67bc259cd48a3e"
APP_ID = "402557_627IR9EKVnm+0WzOWe6rVZVNRhR6Sqpo"
APP_SECRET = "e71a8a379540498f886b0a7a926e70b8"
USER_NAME = "灵泽万川"
LCID = 2052
ORG_NUM = 0

# ================= 工具函数 (模拟 SDK 行为) =================

def sdk_base64_encode(data_bytes):
    """
    模拟 SDK 的 base64_util.encode
    SDK 使用标准 Base64 字符集
    """
    return base64.b64encode(data_bytes).decode('utf-8')

def sdk_base64_decode(data_str):
    """
    模拟 SDK 的 base64_util.decode
    """
    return base64.b64decode(data_str)

def sdk_hmac_sha256(content, sign_key):
    """
    模拟 SDK 的 hmac_util.HmacSHA256
    注意：SDK 是对 HMAC 的 16进制字符串 进行 Base64 编码，而不是对原始二进制进行 Base64
    """
    signature = hmac.new(sign_key.encode('utf-8'), content.encode('utf-8'), hashlib.sha256).digest()
    sign_hex = signature.hex()
    return sdk_base64_encode(sign_hex.encode('utf-8'))

# --- DecodeAppSecret 相关逻辑 (用于 X-Api-Signature) ---
# 即使这个逻辑看起来包含随机性，我们还是照搬 SDK 的实现，以防万一

def encode_char(ch):
    f = lambda x: chr((ord(ch) - x + 13) % 26 + x)
    return f(97) if ch.islower() else (f(65) if ch.isupper() else ch)

def rot(s):
    return ''.join(encode_char(c) for c in s)

def generate_code():
    # 模拟 SDK 的 generate_code
    # SDK 中 ApiConfig.Xor_Code 默认为空
    ret_code = ''
    rand = str(random.randint(1000, 9999))
    ret_code += '0054s397' + rand[0]
    ret_code += 'p6234378' + rand[1]
    ret_code += 'o09pn7q3' + rand[2]
    ret_code += 'r5qropr7' + rand[3]
    return ret_code

def extend_byte_array(origin, extend_type=0):
    if extend_type == 0:
        return bytearray(rot(origin), encoding='utf-8')
    else:
        gene_str = ''
        for i in range(0, 4):
            gene_str += origin[i * 9:(i * 9 + 8)]
        return bytearray(rot(gene_str), encoding='utf-8')

def xor_code(byte_array):
    pwd_array = extend_byte_array(generate_code(), extend_type=1)
    out_array = bytearray()
    for i in range(0, len(byte_array)):
        out_array.insert(i, byte_array[i] ^ pwd_array[i])
    return out_array

def decode_app_secret(app_secret):
    if len(app_secret) != 32:
        return ''
    else:
        base64_decode = sdk_base64_decode(app_secret)
        base64_xor = xor_code(bytearray(base64_decode))
        return sdk_base64_encode(base64_xor)

# ================= 主逻辑 =================

def execute_bill_query():
    # 1. 准备请求 URL
    service_name = "Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.ExecuteBillQuery"
    api_url = f"{SERVER_URL}/{service_name}.common.kdsvc"
    
    # 2. 准备请求参数
    payload = {
        "data": {
            "FormId": "STK_Inventory",
            "FieldKeys": "FmaterialID.Fnumber,FmaterialID.FName,FStockID.Fnumber,FStockID.Fname,fbaseqty",
            "FilterString": "FStockID.Fnumber='CK0201'",
            "OrderString": "",
            "TopRowCount": 0,
            "StartRow": 0,
            "Limit": 2,  # 设置 Limit 为 2
            "SubSystemId": ""
        }
    }

    # 3. 构造 Headers
    
    # 基础信息
    time_stamp = str(int(time.time()))
    nonce = str(int(time.time()))
    
    # 处理 AppID 和 ClientSecret
    # SDK 逻辑: 如果 AppID 包含 '_', 则拆分，第一部分为 ClientID，第二部分解码后为 ClientSecret
    client_id = ''
    client_sec = ''
    arr = APP_ID.split('_')
    if len(arr) == 2:
        client_id = arr[0]
        # 注意：这里调用 decode_app_secret，虽然它包含随机性，但 SDK 就是这么做的
        client_sec = decode_app_secret(arr[1])
    
    # 构建 X-Api-Signature 签名串
    # Path 处理: 去掉 http://ip:port 部分，保留 /K3Cloud/...
    # SDK 逻辑: p_index = service_url.index('/', 10)
    path_url = api_url
    if api_url.startswith('http'):
        try:
            p_index = api_url.index('/', 10)
            if p_index > -1:
                path_url = api_url[p_index:]
        except ValueError:
            pass
    
    # URL Encode 并替换 / 为 %2F
    path_url_encoded = quote(path_url, encoding='utf-8').replace('/', '%2F')
    
    api_sign_str = f"POST\n{path_url_encoded}\n\nx-api-nonce:{nonce}\nx-api-timestamp:{time_stamp}\n"
    
    # 构建 X-KD-AppData
    app_data_str = f"{ACCT_ID},{USER_NAME},{LCID},{ORG_NUM}"
    
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Kingdee/Python WebApi SDK 7.3 (compatible; MSIE 6.0; Windows NT 5.1;SV1)",
        "Accept-Charset": "utf-8",
        
        # API Gateway Headers
        "X-Api-ClientID": client_id,
        "X-Api-Auth-Version": "2.0",
        "X-Api-Timestamp": time_stamp,
        "X-Api-Nonce": nonce,
        "X-Api-SignHeaders": "x-api-timestamp,x-api-nonce",
        "X-Api-Signature": sdk_hmac_sha256(api_sign_str, client_sec),
        
        # K3 Cloud Native Headers
        "X-KD-AppKey": APP_ID,
        "X-KD-AppData": sdk_base64_encode(app_data_str.encode('utf-8')),
        "X-KD-Signature": sdk_hmac_sha256(APP_ID + app_data_str, APP_SECRET)
    }

    print("-" * 50)
    print(f"Request URL: {api_url}")
    print(f"Headers: {json.dumps(headers, indent=2, ensure_ascii=False)}")
    print(f"Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")
    print("-" * 50)

    # 4. 发送请求
    try:
        response = requests.post(api_url, json=payload, headers=headers)
        print(f"Response Status Code: {response.status_code}")
        print("Response Body:")
        print(response.text)
        
        # 尝试解析 JSON
        try:
            res_json = response.json()
            # print(json.dumps(res_json, indent=2, ensure_ascii=False))
        except:
            pass
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    execute_bill_query()
