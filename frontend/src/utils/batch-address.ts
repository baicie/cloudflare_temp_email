export const MAX_BATCH_ADDRESS_COUNT = 100;

export const buildBatchAddressNames = (
    baseName: string,
    startNumber: number,
    count: number,
): string[] => {
    const normalizedBaseName = baseName.trim();
    if (!normalizedBaseName) {
        throw new Error('Base name is required');
    }
    if (!Number.isInteger(startNumber) || startNumber < 0) {
        throw new RangeError('Start number must be a non-negative integer');
    }
    if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH_ADDRESS_COUNT) {
        throw new RangeError(`Count must be between 1 and ${MAX_BATCH_ADDRESS_COUNT}`);
    }

    const endNumber = startNumber + count - 1;
    const sequenceWidth = Math.max(3, String(endNumber).length);
    return Array.from({ length: count }, (_, index) => {
        const sequence = String(startNumber + index).padStart(sequenceWidth, '0');
        return `${normalizedBaseName}${sequence}`;
    });
};
