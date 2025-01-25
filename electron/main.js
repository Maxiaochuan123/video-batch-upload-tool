const { app, BrowserWindow, globalShortcut } = require('electron')
const path = require('path')
require('@electron/remote/main').initialize()

// 保存窗口实例的引用
let win = null

function createWindow() {
  // 如果窗口已存在，则不创建新窗口
  if (win) {
    return win
  }

  // 创建一个隐藏的窗口
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: '视频批量上传工具',
    icon: path.join(__dirname, '../src/assets/logo.ico'),
    autoHideMenuBar: true,
    show: false, // 先隐藏窗口
    backgroundColor: '#ffffff', // 设置背景色，减少白屏
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      devTools: true
    }
  })

  // 启用 remote 模块
  require('@electron/remote/main').enable(win.webContents)

  // 最大化窗口
  win.maximize()

  // 判断是开发环境还是生产环境
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    // 开发模式下自动打开开发者工具
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 当内容加载完成时显示窗口
  win.webContents.on('did-finish-load', () => {
    win.show()
  })

  // 监听窗口关闭事件
  win.on('closed', () => {
    win = null
  })

  return win
}

// 在 app ready 之前设置
app.commandLine.appendSwitch('disable-site-isolation-trials')
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')

app.whenReady().then(() => {
  win = createWindow()

  // 注册快捷键
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (win) win.webContents.toggleDevTools()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      win = createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 注销所有快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
}) 