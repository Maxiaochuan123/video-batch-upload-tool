const { app } = require('@electron/remote');
const fs = require('fs');
const path = require('path');

class LicenseManager {
    constructor() {
        const userDataPath = app.getPath('userData');
        this.licenseFile = path.join(userDataPath, 'license.json');
    }

    // 生成激活密钥
    generateLicenseKey(expirationDate) {
        const data = {
            expirationDate,
            timestamp: new Date().toISOString()
        };
        const key = Buffer.from(JSON.stringify(data)).toString('base64');
        return key;
    }

    // 设置默认试用期
    setDefaultTrial() {
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setMonth(trialEnd.getMonth() + 1); // 一个月试用期

        const license = {
            expirationDate: trialEnd.toISOString(),
            lastCheck: now.toISOString(),
            isTrial: true
        };

        try {
            fs.writeFileSync(this.licenseFile, JSON.stringify(license));
            return true;
        } catch (error) {
            console.error('设置试用期失败:', error);
            return false;
        }
    }

    // 验证并保存激活密钥
    validateAndSaveLicenseKey(licenseKey) {
        try {
            // 解密密钥
            const data = JSON.parse(Buffer.from(licenseKey, 'base64').toString());
            const expirationDate = new Date(data.expirationDate);
            
            // 验证日期格式
            if (isNaN(expirationDate.getTime())) {
                return { success: false, message: '无效的激活密钥' };
            }

            // 保存许可证信息
            const license = {
                expirationDate: data.expirationDate,
                lastCheck: new Date().toISOString(),
                licenseKey,
                isTrial: false
            };
            fs.writeFileSync(this.licenseFile, JSON.stringify(license));
            
            // 验证是否过期
            const now = new Date();
            if (now > expirationDate) {
                return { success: false, message: '许可证已过期' };
            }

            return { success: true, message: '激活成功' };
        } catch (error) {
            console.error('验证密钥失败:', error);
            return { success: false, message: '无效的激活密钥' };
        }
    }

    // 读取许可证信息
    readLicense() {
        try {
            if (fs.existsSync(this.licenseFile)) {
                const data = fs.readFileSync(this.licenseFile, 'utf8');
                return JSON.parse(data);
            }
            // 如果许可证文件不存在，设置默认试用期
            this.setDefaultTrial();
            return this.readLicense();
        } catch (error) {
            console.error('读取许可证失败:', error);
        }
        return null;
    }

    // 检查许可证是否有效
    checkLicense() {
        const license = this.readLicense();
        if (!license || !license.expirationDate) {
            return false;
        }

        const now = new Date();
        const expiration = new Date(license.expirationDate);
        return now <= expiration;
    }

    // 获取过期时间
    getExpirationDate() {
        const license = this.readLicense();
        return license ? license.expirationDate : null;
    }

    // 是否是试用版
    isTrial() {
        const license = this.readLicense();
        return license ? !!license.isTrial : false;
    }
}

export const licenseManager = new LicenseManager(); 