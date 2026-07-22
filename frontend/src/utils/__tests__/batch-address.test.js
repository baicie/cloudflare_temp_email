import { describe, expect, it } from 'vitest';

import { buildBatchAddressNames, MAX_BATCH_ADDRESS_COUNT } from '../batch-address';

describe('buildBatchAddressNames', () => {
    it('builds zero-padded names from the requested start number', () => {
        expect(buildBatchAddressNames('batch', 1, 3)).toEqual([
            'batch001',
            'batch002',
            'batch003',
        ]);
    });

    it('trims the base name and expands padding for larger ranges', () => {
        expect(buildBatchAddressNames('  mail  ', 999, 3)).toEqual([
            'mail0999',
            'mail1000',
            'mail1001',
        ]);
    });

    it('rejects invalid start numbers and counts', () => {
        expect(() => buildBatchAddressNames('', 1, 1)).toThrow();
        expect(() => buildBatchAddressNames('batch', -1, 1)).toThrow();
        expect(() => buildBatchAddressNames('batch', 1.5, 1)).toThrow();
        expect(() => buildBatchAddressNames('batch', 1, 0)).toThrow();
        expect(() => buildBatchAddressNames('batch', 1, MAX_BATCH_ADDRESS_COUNT + 1)).toThrow();
    });
});
