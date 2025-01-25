const path = require('path');

exports.default = async function(context) {
  // 在打包后执行
  if (context.electronPlatformName === 'win32') {
    // 设置图标路径
    const iconPath = path.resolve(__dirname, './src/assets/logo.ico');
    context.appOutDir = path.join(context.outDir, 'win-unpacked');
    
    // 设置应用程序图标
    await context.packager.config.beforeBuild(context.appOutDir, iconPath);
    
    // 设置安装程序图标
    context.targets.forEach(target => {
      if (target.name === 'nsis') {
        target.options = target.options || {};
        target.options.installerIcon = iconPath;
        target.options.uninstallerIcon = iconPath;
        target.options.installerHeaderIcon = iconPath;
      }
    });
  }
}; 