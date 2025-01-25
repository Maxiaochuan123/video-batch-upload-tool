<template>
  <div class="license-activation">
    <el-dialog
      v-model="visible"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="isValid"
      width="420px"
      class="activation-dialog"
    >
      <div class="activation-content">
        <div class="activation-header">
          <el-icon class="header-icon"><Key /></el-icon>
          <h2 class="header-title">软件授权</h2>
        </div>

        <div class="status-section" :class="{ 'trial': isTrial }">
          <div class="status-title">{{ statusTitle }}</div>
          <div class="status-message">{{ statusMessage }}</div>
          <div v-if="!isTrial" class="contact-info">
            <el-icon><ChatDotRound /></el-icon>
            <span>微信: 13111866951</span>
          </div>
        </div>
        
        <div class="expiration-info">
          <el-icon><Timer /></el-icon>
          <span>{{ expirationText }}</span>
        </div>

        <template v-if="!isTrial">
          <el-input
            v-model="licenseKey"
            placeholder="请输入激活码"
            :rows="3"
            type="textarea"
            class="license-input"
            resize="none"
          />

          <el-button 
            type="primary" 
            @click="activateLicense" 
            :loading="loading"
            class="activate-button"
          >
            {{ loading ? '正在激活...' : '立即激活' }}
          </el-button>
        </template>

        <template v-else>
          <el-button 
            type="primary" 
            @click="closeDialog" 
            class="activate-button"
          >
            开始使用
          </el-button>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { licenseManager } from '@/utils/LicenseManager'
import { Key, ChatDotRound, Timer } from '@element-plus/icons-vue'

export default {
  name: 'LicenseActivation',
  components: {
    Key,
    ChatDotRound,
    Timer
  },
  data() {
    return {
      visible: false,
      licenseKey: '',
      loading: false,
      isValid: false,
      isTrial: false,
      expirationDate: null
    }
  },
  computed: {
    statusTitle() {
      if (this.isTrial) {
        return '免费试用版'
      }
      return this.expirationDate ? '许可证已过期' : '软件未激活'
    },
    statusMessage() {
      if (this.isTrial) {
        return '感谢使用本软件，您可以免费试用一个月'
      }
      return '请联系作者获取激活码继续使用'
    },
    expirationText() {
      if (!this.expirationDate) return '';
      const date = new Date(this.expirationDate);
      if (this.isTrial) {
        return `试用期至：${date.toLocaleDateString()}`
      }
      return `授权过期时间：${date.toLocaleDateString()}`
    }
  },
  created() {
    this.checkLicense();
  },
  methods: {
    checkLicense() {
      this.isValid = licenseManager.checkLicense();
      this.isTrial = licenseManager.isTrial();
      this.expirationDate = licenseManager.getExpirationDate();
      this.visible = !this.isValid || this.isTrial;
    },
    closeDialog() {
      this.visible = false;
    },
    async activateLicense() {
      if (!this.licenseKey.trim()) {
        this.$message.error('请输入激活码');
        return;
      }

      this.loading = true;
      try {
        const result = licenseManager.validateAndSaveLicenseKey(this.licenseKey.trim());
        if (result.success) {
          this.$message.success('激活成功');
          this.checkLicense();
          if (this.isValid) {
            this.visible = false;
          }
        } else {
          this.$message.error(result.message);
        }
      } catch (error) {
        this.$message.error('激活失败，请检查激活码是否正确');
      } finally {
        this.loading = false;
      }
    }
  }
}
</script>

<style scoped>
.activation-dialog :deep(.el-dialog) {
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.activation-dialog :deep(.el-dialog__header) {
  display: none;
}

.activation-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.activation-content {
  padding: 32px;
}

.activation-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
}

.header-icon {
  font-size: 28px;
  color: var(--el-color-primary);
  margin-right: 12px;
}

.header-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.status-section {
  background: linear-gradient(to right, var(--el-color-warning-light-9), var(--el-color-warning-light-8));
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  text-align: center;
}

.status-section.trial {
  background: linear-gradient(to right, var(--el-color-success-light-8), var(--el-color-success-light-7));
}

.status-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-color-warning-dark-2);
  margin-bottom: 12px;
}

.trial .status-title {
  color: var(--el-color-success-dark-2);
}

.status-message {
  color: var(--el-text-color-regular);
  margin-bottom: 12px;
  font-size: 15px;
}

.contact-info {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 20px;
  color: var(--el-color-primary);
}

.contact-info .el-icon {
  margin-right: 8px;
  font-size: 16px;
}

.expiration-info {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  margin-bottom: 24px;
}

.expiration-info .el-icon {
  margin-right: 8px;
  color: var(--el-color-warning);
}

.trial .expiration-info .el-icon {
  color: var(--el-color-success);
}

.license-input {
  margin-bottom: 24px;
}

.license-input :deep(.el-textarea__inner) {
  border-radius: 12px;
  font-family: monospace;
  font-size: 14px;
  padding: 12px;
  background-color: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-light);
  transition: all 0.3s ease;
  height: 100px;
}

.license-input :deep(.el-textarea__inner:focus) {
  background-color: var(--el-color-white);
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-8);
}

.activate-button {
  width: 100%;
  height: 44px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 1px;
  transition: all 0.3s ease;
  background: linear-gradient(to right, var(--el-color-primary), var(--el-color-primary-light-3));
  border: none;
}

.activate-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--el-color-primary-rgb), 0.3);
  opacity: 0.9;
}

.activate-button:active {
  transform: translateY(0);
}
</style> 