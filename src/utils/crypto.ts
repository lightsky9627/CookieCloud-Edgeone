import CryptoJS from 'crypto-js';

export type CryptoType = 'legacy' | 'aes-128-cbc-fixed';

/**
 * CookieCloud 加密数据解密
 * 
 * 两种模式：
 * 1. aes-128-cbc-fixed（新版标准算法）：
 *    - key 为 MD5(uuid + '-' + password) 的前 16 个字符 (UTF-8)
 *    - IV 为 16 个 0 字节 ('00000000000000000000000000000000')
 *    - mode: CBC, padding: Pkcs7
 *    - 密文为纯 Base64
 * 
 * 2. legacy（经典算法）：
 *    - OpenSSL EVP_BytesToKey 模式（CryptoJS 默认 passphrase）
 *    - key 为 MD5(uuid + '-' + password) 的前 16 个字符
 *    - 密文带 "Salted__" 前缀
 */
export function cookieDecrypt(
  uuid: string,
  encrypted: string,
  password: string,
  cryptoType: CryptoType = 'legacy'
): any {
  if (cryptoType === 'aes-128-cbc-fixed') {
    const hash = CryptoJS.MD5(`${uuid}-${password}`).toString();
    const theKey = hash.substring(0, 16);
    const fixedIv = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');
    const options = {
      iv: fixedIv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    };
    const decrypted = CryptoJS.AES.decrypt(
      encrypted,
      CryptoJS.enc.Utf8.parse(theKey),
      options
    ).toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new Error('Decryption failed, incorrect password or corrupted data');
    }
    return JSON.parse(decrypted);
  } else {
    const theKey = CryptoJS.MD5(`${uuid}-${password}`).toString().substring(0, 16);
    const decrypted = CryptoJS.AES.decrypt(encrypted, theKey).toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      throw new Error('Decryption failed, incorrect password or corrupted data');
    }
    return JSON.parse(decrypted);
  }
}

/**
 * CookieCloud 加密数据加密（用于测试或服务端工具方法）
 */
export function cookieEncrypt(
  uuid: string,
  data: any,
  password: string,
  cryptoType: CryptoType = 'legacy'
): string {
  const dataToEncrypt = typeof data === 'string' ? data : JSON.stringify(data);

  if (cryptoType === 'aes-128-cbc-fixed') {
    const hash = CryptoJS.MD5(`${uuid}-${password}`).toString();
    const theKey = hash.substring(0, 16);
    const fixedIv = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');
    const options = {
      iv: fixedIv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    };
    const encrypted = CryptoJS.AES.encrypt(
      dataToEncrypt,
      CryptoJS.enc.Utf8.parse(theKey),
      options
    );
    return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
  } else {
    const theKey = CryptoJS.MD5(`${uuid}-${password}`).toString().substring(0, 16);
    const encrypted = CryptoJS.AES.encrypt(dataToEncrypt, theKey).toString();
    return encrypted;
  }
}
