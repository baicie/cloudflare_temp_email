<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useScopedI18n } from '@/i18n/app'

import { useGlobalState } from '../../store'
import { api } from '../../api'
import AddressCredentialModal from '../../components/AddressCredentialModal.vue'
import BatchAddressResultModal from '../../components/BatchAddressResultModal.vue'
import {
    buildBatchAddressNames,
    createBatchAddresses,
    MAX_BATCH_ADDRESS_COUNT,
} from '../../utils/batch-address'

const {
    loading, openSettings,
} = useGlobalState()
const message = useMessage()

const { t } = useScopedI18n('views.admin.CreateAccount')

const enablePrefix = ref(true)
const enableRandomSubdomain = ref(false)
const emailName = ref("")
const emailDomain = ref("")
const showReultModal = ref(false)
const result = ref("")
const addressPassword = ref("")
const createdAddress = ref("")
const createMode = ref('single')
const batchStartNumber = ref(1)
const batchCount = ref(10)
const batchCreating = ref(false)
const batchProgress = ref(0)
const batchResults = ref([])
const batchFailures = ref([])
const showBatchResultModal = ref(false)

const modeOptions = computed(() => [
    { label: t('singleMode'), value: 'single' },
    { label: t('batchMode'), value: 'batch' },
])

const batchNames = computed(() => {
    try {
        return buildBatchAddressNames(emailName.value, batchStartNumber.value, batchCount.value)
    } catch {
        return []
    }
})

const displayedPrefix = computed(() => (
    enablePrefix.value && openSettings.value.prefix ? openSettings.value.prefix : ''
))

const batchPreview = computed(() => {
    if (!batchNames.value.length || !emailDomain.value) return ''
    const first = `${displayedPrefix.value}${batchNames.value[0]}@${emailDomain.value}`
    const lastName = batchNames.value[batchNames.value.length - 1]
    const last = `${displayedPrefix.value}${lastName}@${emailDomain.value}`
    return first === last ? first : `${first} - ${last}`
})

const canUseRandomSubdomain = computed(() => {
    if (!emailDomain.value) {
        return false
    }
    return (openSettings.value.randomSubdomainDomains || []).includes(emailDomain.value)
})

watch(canUseRandomSubdomain, (enabled) => {
    if (!enabled) {
        enableRandomSubdomain.value = false
    }
})

const newEmail = async () => {
    if (!emailName.value || !emailDomain.value) {
        message.error(t('fillInAllFields'))
        return
    }
    try {
        const res = await api.fetch(`/admin/new_address`, {
            method: 'POST',
            body: JSON.stringify({
                enablePrefix: enablePrefix.value,
                enableRandomSubdomain: enableRandomSubdomain.value,
                name: emailName.value,
                domain: emailDomain.value,
            })
        })
        result.value = res["jwt"];
        addressPassword.value = res["password"] || '';
        createdAddress.value = res["address"] || '';
        message.success(t('successTip'))
        showReultModal.value = true
    } catch (error) {
        message.error(error.message || "error");
    }
}

const newBatchEmails = async () => {
    if (!emailDomain.value || !batchNames.value.length) {
        message.error(t('invalidBatch'))
        return
    }

    batchCreating.value = true
    batchProgress.value = 0
    batchResults.value = []
    batchFailures.value = []

    try {
        const names = [...batchNames.value]
        const domain = emailDomain.value
        const shouldUsePrefix = enablePrefix.value
        const shouldUseRandomSubdomain = enableRandomSubdomain.value
        const prefix = displayedPrefix.value
        const outcome = await createBatchAddresses(names, async (name) => {
            const res = await api.fetch(`/admin/new_address`, {
                method: 'POST',
                body: JSON.stringify({
                    enablePrefix: shouldUsePrefix,
                    enableRandomSubdomain: shouldUseRandomSubdomain,
                    name,
                    domain,
                })
            })
            return {
                address: res.address || `${prefix}${name}@${domain}`,
                jwt: res.jwt || '',
                password: res.password || '',
            }
        }, (percentage) => {
            batchProgress.value = percentage
        })
        batchResults.value = outcome.results
        batchFailures.value = outcome.failures

        showBatchResultModal.value = true
        if (batchFailures.value.length) {
            message.warning(t('batchPartialSuccess', {
                created: batchResults.value.length,
                failed: batchFailures.value.length,
            }))
        } else {
            message.success(t('batchSuccess', { count: batchResults.value.length }))
        }
    } finally {
        batchCreating.value = false
    }
}

onMounted(async () => {
    if (openSettings.prefix) {
        enablePrefix.value = true
    }
    emailDomain.value = openSettings.value.domains?.[0]?.value || ""
})
</script>

<template>
    <div class="center">
        <AddressCredentialModal v-model:show="showReultModal" :address="createdAddress" :jwt="result"
            :address-password="addressPassword" />
        <BatchAddressResultModal v-model:show="showBatchResultModal" :results="batchResults"
            :failures="batchFailures" />
        <n-card :bordered="false" embedded class="create-card">
            <n-form-item-row :label="t('createMode')">
                <n-radio-group v-model:value="createMode" :disabled="batchCreating" class="mode-switch">
                    <n-radio-button v-for="option in modeOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </n-radio-button>
                </n-radio-group>
            </n-form-item-row>
            <n-form-item-row v-if="openSettings.prefix" :label="t('enablePrefix')">
                <n-switch v-model:value="enablePrefix" :round="false" :disabled="batchCreating" />
            </n-form-item-row>
            <n-form-item-row :label="createMode === 'batch' ? t('batchBaseName') : t('address')">
                <n-input-group>
                    <n-input-group-label v-if="enablePrefix && openSettings.prefix">
                        {{ openSettings.prefix }}
                    </n-input-group-label>
                    <n-input v-model:value="emailName"
                        :placeholder="createMode === 'batch' ? t('batchBaseNamePlaceholder') : ''"
                        :disabled="batchCreating" />
                    <n-input-group-label>@</n-input-group-label>
                    <n-select v-model:value="emailDomain" :consistent-menu-width="false"
                        :options="openSettings.domains" :disabled="batchCreating" />
                </n-input-group>
            </n-form-item-row>
            <n-grid v-if="createMode === 'batch'" cols="1 500:2" responsive="self" :x-gap="12">
                <n-form-item-gi :label="t('batchStartNumber')">
                    <n-input-number v-model:value="batchStartNumber" :min="0" :precision="0"
                        :disabled="batchCreating" />
                </n-form-item-gi>
                <n-form-item-gi :label="t('batchCount')">
                    <n-input-number v-model:value="batchCount" :min="1" :max="MAX_BATCH_ADDRESS_COUNT"
                        :precision="0" :disabled="batchCreating" />
                </n-form-item-gi>
            </n-grid>
            <n-alert v-if="createMode === 'batch' && batchPreview" type="info" :show-icon="false"
                :bordered="false" class="batch-preview">
                <span>{{ t('batchPreview') }}</span>
                <code>{{ batchPreview }}</code>
            </n-alert>
            <n-form-item-row v-if="canUseRandomSubdomain">
                <n-checkbox v-model:checked="enableRandomSubdomain" :disabled="batchCreating">
                    {{ t('enableRandomSubdomain') }}
                </n-checkbox>
                <p style="margin: 8px 0 0; opacity: 0.75;">
                    {{ t('randomSubdomainTip') }}
                </p>
            </n-form-item-row>
            <n-progress v-if="batchCreating" type="line" :percentage="batchProgress" :show-indicator="true"
                class="batch-progress" />
            <n-button @click="createMode === 'batch' ? newBatchEmails() : newEmail()" type="primary" block
                :loading="createMode === 'batch' ? batchCreating : loading" :disabled="batchCreating">
                {{ createMode === 'batch' ? t('createBatch') : t('creatNewEmail') }}
            </n-button>
        </n-card>
    </div>
</template>

<style scoped>
.center {
    display: flex;
    text-align: left;
    place-items: center;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
    padding: 20px;
}

.create-card {
    width: min(600px, 100%);
}

.mode-switch {
    display: flex;
    width: 100%;
}

.mode-switch :deep(.n-radio-button) {
    flex: 1;
    min-width: 0;
}

.mode-switch :deep(.n-radio-button__state-border) {
    width: 100%;
}

.mode-switch :deep(.n-radio-button__label) {
    display: block;
    overflow: hidden;
    text-align: center;
    text-overflow: ellipsis;
}

.batch-preview {
    margin-bottom: 16px;
}

.batch-preview code {
    display: block;
    margin-top: 4px;
    overflow-wrap: anywhere;
}

.batch-progress {
    margin-bottom: 12px;
}
</style>
