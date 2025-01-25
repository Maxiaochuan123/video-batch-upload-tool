const fs = require('fs');
const path = require('path');

function showUsage() {
    console.log('使用方法:');
    console.log('node license-manager.js generate <到期日期>');
    console.log('示例:');
    console.log('node license-manager.js generate "2024-12-31"');
}

function generateLicense(expirationDate) {
    try {
        const license = {
            expirationDate: expirationDate,
            lastCheck: new Date().toISOString()
        };
        
        // 生成许可证文件到当前目录
        const outputFile = path.join(process.cwd(), 'license.json');
        fs.writeFileSync(outputFile, JSON.stringify(license, null, 2));
        return outputFile;
    } catch (error) {
        console.error('生成许可证失败:', error);
        return null;
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        showUsage();
        return;
    }

    const [command, date] = args;
    
    if (command === 'generate') {
        try {
            const outputFile = generateLicense(date);
            if (outputFile) {
                console.log('许可证文件生成成功！');
                console.log('文件位置:', outputFile);
                console.log('\n请将此文件发送给用户，并指导用户将其放置到以下目录：');
                console.log('Windows: %APPDATA%/video-batch-upload-tool/license.json');
                console.log('Mac: ~/Library/Application Support/video-batch-upload-tool/license.json');
            } else {
                console.log('许可证生成失败！');
            }
        } catch (error) {
            console.error('错误:', error.message);
        }
    } else {
        showUsage();
    }
}

main().catch(console.error); 