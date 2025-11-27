// K3 Cloud配置信息
const K3_CONFIG = {
  SERVER_URL: 'http://39.108.116.74/K3Cloud',
  ACCT_ID: '67bc259cd48a3e',
  APP_ID: '402557_627IR9EKVnm+0WzOWe6rVZVNRhR6Sqpo',
  APP_SECRET: 'e71a8a379540498f886b0a7a926e70b8',
  USER_NAME: '灵泽万川',
  LCID: 2052,
  ORG_NUM: 0
};

// 仓库配置映射
export const WAREHOUSE_CONFIG = {
  rawMaterial: ['CK0102', 'CK0202', 'CK1001'],  // 原材料仓
  workshop: ['CK0103', 'CK0203', 'CK0301'],     // 车间仓
  semiFinished: ['CK0104'],                      // 半成品仓
  finished: ['104', 'CK0201']                    // 成品仓
};

// 库存数据接口
export interface InventoryItem {
  materialCode: string;    // 物料编码
  materialName: string;    // 物料名称
  warehouseCode: string;   // 仓库编码
  warehouseName: string;   // 仓库名称
  quantity: number;        // 库存数量
}

// Base64编码 (浏览器兼容)
function base64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

// Base64解码 (浏览器兼容)
function base64Decode(str: string): Uint8Array {
  const binaryString = atob(str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// HMAC SHA256签名 (使用Web Crypto API)
async function hmacSha256(content: string, signKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(signKey);
  const contentData = encoder.encode(content);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, contentData);
  const signatureArray = Array.from(new Uint8Array(signature));
  const signHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return base64Encode(signHex);
}

// ROT编码
function encodeChar(ch: string): string {
  const code = ch.charCodeAt(0);
  const f = (x: number) => String.fromCharCode((code - x + 13) % 26 + x);

  if (ch >= 'a' && ch <= 'z') return f(97);
  if (ch >= 'A' && ch <= 'Z') return f(65);
  return ch;
}

function rot(s: string): string {
  return s.split('').map(encodeChar).join('');
}

// 生成随机码
function generateCode(): string {
  let retCode = '';
  const rand = Math.floor(1000 + Math.random() * 9000).toString();
  retCode += '0054s397' + rand[0];
  retCode += 'p6234378' + rand[1];
  retCode += 'o09pn7q3' + rand[2];
  retCode += 'r5qropr7' + rand[3];
  return retCode;
}

// 扩展字节数组 (浏览器兼容)
function extendByteArray(origin: string, extendType: number = 0): Uint8Array {
  const encoder = new TextEncoder();
  if (extendType === 0) {
    return encoder.encode(rot(origin));
  } else {
    let geneStr = '';
    for (let i = 0; i < 4; i++) {
      geneStr += origin.substring(i * 9, i * 9 + 8);
    }
    return encoder.encode(rot(geneStr));
  }
}

// XOR编码 (浏览器兼容)
function xorCode(byteArray: Uint8Array): Uint8Array {
  const pwdArray = extendByteArray(generateCode(), 1);
  const outArray = new Uint8Array(byteArray.length);

  for (let i = 0; i < byteArray.length; i++) {
    outArray[i] = byteArray[i] ^ pwdArray[i];
  }

  return outArray;
}

// 解码APP Secret
function decodeAppSecret(appSecret: string): string {
  if (appSecret.length !== 32) {
    return '';
  }

  const base64DecodeResult = base64Decode(appSecret);
  const base64Xor = xorCode(base64DecodeResult);

  // 转换Uint8Array为base64字符串
  let binary = '';
  base64Xor.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

/**
 * 查询K3 Cloud库存数据
 * @param warehouseCode 仓库编码，如 'CK0201'
 * @param limit 返回记录数限制
 * @returns 库存数据数组
 */
export async function queryInventory(
  warehouseCode: string,
  limit: number = 100
): Promise<InventoryItem[]> {
  const serviceName = 'Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.ExecuteBillQuery';
  const apiUrl = `${K3_CONFIG.SERVER_URL}/${serviceName}.common.kdsvc`;

  // 准备请求数据
  const payload = {
    data: {
      FormId: 'STK_Inventory',
      FieldKeys: 'FmaterialID.Fnumber,FmaterialID.FName,FStockID.Fnumber,FStockID.Fname,fbaseqty',
      FilterString: `FStockID.Fnumber='${warehouseCode}'`,
      OrderString: '',
      TopRowCount: 0,
      StartRow: 0,
      Limit: limit,
      SubSystemId: ''
    }
  };

  // 构建时间戳和nonce
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = timestamp;

  // 处理AppID和ClientSecret
  let clientId = '';
  let clientSec = '';
  const arr = K3_CONFIG.APP_ID.split('_');
  if (arr.length === 2) {
    clientId = arr[0];
    clientSec = decodeAppSecret(arr[1]);
  }

  // 构建签名路径
  let pathUrl = apiUrl;
  if (apiUrl.startsWith('http')) {
    const urlObj = new URL(apiUrl);
    pathUrl = urlObj.pathname;
  }

  // URL编码路径
  const pathUrlEncoded = encodeURIComponent(pathUrl).replace(/%2F/g, '%2F');

  // 构建API签名字符串
  const apiSignStr = `POST\n${pathUrlEncoded}\n\nx-api-nonce:${nonce}\nx-api-timestamp:${timestamp}\n`;

  // 构建AppData
  const appDataStr = `${K3_CONFIG.ACCT_ID},${K3_CONFIG.USER_NAME},${K3_CONFIG.LCID},${K3_CONFIG.ORG_NUM}`;

  // 异步生成签名
  const apiSignature = await hmacSha256(apiSignStr, clientSec);
  const kdSignature = await hmacSha256(K3_CONFIG.APP_ID + appDataStr, K3_CONFIG.APP_SECRET);

  // 构建请求头
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Kingdee/Node.js WebApi SDK 7.3',
    'Accept-Charset': 'utf-8',

    // API Gateway Headers
    'X-Api-ClientID': clientId,
    'X-Api-Auth-Version': '2.0',
    'X-Api-Timestamp': timestamp,
    'X-Api-Nonce': nonce,
    'X-Api-SignHeaders': 'x-api-timestamp,x-api-nonce',
    'X-Api-Signature': apiSignature,

    // K3 Cloud Native Headers
    'X-KD-AppKey': K3_CONFIG.APP_ID,
    'X-KD-AppData': base64Encode(appDataStr),
    'X-KD-Signature': kdSignature
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // 解析返回数据
    if (result && Array.isArray(result)) {
      return result.map((item: any[]) => ({
        materialCode: item[0] || '',
        materialName: item[1] || '',
        warehouseCode: item[2] || '',
        warehouseName: item[3] || '',
        quantity: parseFloat(item[4]) || 0
      }));
    }

    return [];
  } catch (error) {
    console.error('K3 Cloud API调用失败:', error);
    throw error;
  }
}

/**
 * 查询所有配置仓库的库存数据
 * @returns 所有仓库的库存数据
 */
export async function queryAllWarehousesInventory(): Promise<InventoryItem[]> {
  const allWarehouses = [
    ...WAREHOUSE_CONFIG.rawMaterial,
    ...WAREHOUSE_CONFIG.workshop,
    ...WAREHOUSE_CONFIG.semiFinished,
    ...WAREHOUSE_CONFIG.finished
  ];

  const inventoryPromises = allWarehouses.map(code =>
    queryInventory(code).catch(err => {
      console.error(`查询仓库 ${code} 失败:`, err);
      return [];
    })
  );

  const results = await Promise.all(inventoryPromises);
  return results.flat();
}
