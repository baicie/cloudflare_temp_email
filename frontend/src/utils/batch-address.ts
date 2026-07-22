export const MAX_BATCH_ADDRESS_COUNT = 100;

export type BatchAddressFailure = {
    name: string;
    error: string;
};

export type BatchAddressOutcome<T> = {
    results: T[];
    failures: BatchAddressFailure[];
};

export type BatchAddressCredential = {
    address: string;
    jwt: string;
    password?: string;
};

const escapeCsvCell = (value: unknown): string => {
    const text = String(value || '');
    const spreadsheetSafeText = /^[=+\-@\t\r\n]/.test(text) ? `'${text}` : text;
    return `"${spreadsheetSafeText.replaceAll('"', '""')}"`;
};

export const buildBatchAddressCsv = (results: BatchAddressCredential[]): string => [
    ['address', 'jwt', 'password'],
    ...results.map((item) => [item.address, item.jwt, item.password]),
].map((row) => row.map(escapeCsvCell).join(',')).join('\n');

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

export const createBatchAddresses = async <T>(
    names: string[],
    createAddress: (name: string) => Promise<T>,
    onProgress: (percentage: number) => void = () => undefined,
): Promise<BatchAddressOutcome<T>> => {
    const results: T[] = [];
    const failures: BatchAddressFailure[] = [];

    for (const [index, name] of names.entries()) {
        try {
            results.push(await createAddress(name));
        } catch (error) {
            failures.push({
                name,
                error: error instanceof Error ? error.message : String(error),
            });
        }
        onProgress(Math.round(((index + 1) / names.length) * 100));
    }

    return { results, failures };
};
