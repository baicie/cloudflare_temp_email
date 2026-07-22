import { describe, expect, it, vi } from 'vitest';

import {
    buildBatchAddressNames,
    buildBatchAddressCsv,
    createBatchAddresses,
    MAX_BATCH_ADDRESS_COUNT,
} from '../batch-address';

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

describe('buildBatchAddressCsv', () => {
    it('exports credentials and neutralizes spreadsheet formulas', () => {
        const csv = buildBatchAddressCsv([
            { address: '=cmd@example.com', jwt: 'jwt-value', password: '' },
        ]);

        expect(csv).toContain('"address","jwt","password"');
        expect(csv).toContain('"\'=cmd@example.com","jwt-value",""');
    });
});

describe('createBatchAddresses', () => {
    it('continues after individual failures and reports progress', async () => {
        const progress = [];
        const createAddress = vi.fn(async (name) => {
            if (name === 'batch002') throw new Error('Address already exists');
            return { address: `${name}@example.com`, jwt: `jwt-${name}` };
        });

        const outcome = await createBatchAddresses(
            ['batch001', 'batch002', 'batch003'],
            createAddress,
            (percentage) => progress.push(percentage),
        );

        expect(outcome.results.map((item) => item.address)).toEqual([
            'batch001@example.com',
            'batch003@example.com',
        ]);
        expect(outcome.failures).toEqual([
            { name: 'batch002', error: 'Address already exists' },
        ]);
        expect(progress).toEqual([33, 67, 100]);
    });
});
