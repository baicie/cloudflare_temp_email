<script setup>
import { computed } from 'vue'
import { ContentCopyRound, DownloadRound } from '@vicons/material'
import { useScopedI18n } from '@/i18n/app'
import { buildBatchAddressCsv } from '../utils/batch-address'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  results: {
    type: Array,
    default: () => [],
  },
  failures: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:show'])
const { t } = useScopedI18n('components.BatchAddressResultModal')
const message = useMessage()

const modalShow = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

const csvContent = computed(() => buildBatchAddressCsv(props.results))

const copyResults = async () => {
  try {
    await navigator.clipboard.writeText(csvContent.value)
    message.success(t('copySuccess'))
  } catch (error) {
    console.error(error)
    message.error(t('copyFailed'))
  }
}

const downloadResults = () => {
  const blob = new Blob([`\uFEFF${csvContent.value}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `batch-addresses-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <n-modal v-model:show="modalShow" preset="card" :title="t('title')"
    style="width: min(920px, calc(100vw - 32px));">
    <n-alert type="warning" :show-icon="false" :bordered="false">
      {{ t('securityTip') }}
    </n-alert>

    <div class="result-summary">
      <n-tag type="success" :bordered="false">
        {{ t('created', { count: results.length }) }}
      </n-tag>
      <n-tag v-if="failures.length" type="error" :bordered="false">
        {{ t('failed', { count: failures.length }) }}
      </n-tag>
      <div class="result-actions">
        <n-button :disabled="!results.length" @click="copyResults">
          <template #icon><n-icon><ContentCopyRound /></n-icon></template>
          {{ t('copyCsv') }}
        </n-button>
        <n-button type="primary" :disabled="!results.length" @click="downloadResults">
          <template #icon><n-icon><DownloadRound /></n-icon></template>
          {{ t('downloadCsv') }}
        </n-button>
      </div>
    </div>

    <n-scrollbar v-if="results.length" style="max-height: 360px; margin-top: 16px;">
      <n-table :single-line="false" size="small">
        <thead>
          <tr>
            <th>{{ t('address') }}</th>
            <th>{{ t('credential') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in results" :key="item.address">
            <td><code>{{ item.address }}</code></td>
            <td><code class="credential-value">{{ item.jwt }}</code></td>
          </tr>
        </tbody>
      </n-table>
    </n-scrollbar>

    <n-alert v-if="failures.length" type="error" :title="t('failureDetails')" class="failure-list">
      <ul>
        <li v-for="item in failures" :key="item.name">
          <code>{{ item.name }}</code>: {{ item.error }}
        </li>
      </ul>
    </n-alert>
  </n-modal>
</template>

<style scoped>
.result-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.result-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.credential-value {
  display: block;
  max-width: 520px;
  overflow-wrap: anywhere;
}

.failure-list {
  margin-top: 16px;
}

.failure-list ul {
  margin: 0;
  padding-left: 20px;
}

@media (max-width: 600px) {
  .result-actions {
    width: 100%;
    margin-left: 0;
  }

  .result-actions :deep(.n-button) {
    flex: 1;
  }
}
</style>
