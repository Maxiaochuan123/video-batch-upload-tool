function generateLicenseKey(expirationDate) {
    const data = {
        expirationDate,
        timestamp: new Date().toISOString()
    };
    return Buffer.from(JSON.stringify(data)).toString('base64');
}

function getExpirationDate(duration) {
    const now = new Date();
    switch (duration) {
        case 'month':
            now.setMonth(now.getMonth() + 1);
            break;
        case 'quarter':
            now.setMonth(now.getMonth() + 3);
            break;
        case 'year':
            now.setFullYear(now.getFullYear() + 1);
            break;
        default:
            console.log('无效的时长选择，请使用: month/quarter/year');
            process.exit(1);
    }
    return now.toISOString().split('T')[0];
}

// 获取命令行参数
const duration = process.argv[2] || 'month';

// 生成到期日期和激活码
const expirationDate = getExpirationDate(duration);
const key = generateLicenseKey(expirationDate);

// 获取时长显示文本
const durationText = {
    month: '一个月',
    quarter: '一个季度',
    year: '一年'
}[duration];

console.log('\n=== 激活码生成工具 ===\n');
console.log('有效期：', durationText);
console.log('到期日期:', expirationDate);
console.log('\n激活码:\n', key);
console.log('\n===================\n'); 