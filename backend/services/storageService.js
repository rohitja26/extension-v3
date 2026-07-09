const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const apiClient = require('../apiClient');
const logger = require('../utils/logger');
const { normalizeLogs } = require('../utils/logNormalizer');

const FILE_PATH = path.join(__dirname, '../prompts.xlsx');
const SHEET_NAME = 'Prompts';

const EXCEL_COLUMNS = [
    { header: 'User', key: 'user', width: 20 },
    { header: 'Provider', key: 'provider', width: 15 },
    { header: 'Prompt', key: 'prompt', width: 50 },
    { header: 'URL', key: 'url', width: 40 },
    { header: 'Timestamp', key: 'timestamp', width: 25 },
    { header: 'Conversation ID', key: 'conversationId', width: 30 }
];

class StorageService {
    constructor() {
        this.workbook = new ExcelJS.Workbook();
        this.ready = this.initializeFile().catch(err => {
            logger.error('[StorageService] Failed to initialize Excel workbook:', err);
            // Re-throw so that subsequent checks on this.ready are aware of the failure
            throw err;
        });
        // Queue to serialize Excel write operations and prevent concurrent file access conflicts
        this.excelWriteQueue = Promise.resolve();
    }

    /**
     * Initializes the Excel file if it does not already exist.
     */
    async initializeFile() {
        try {
            if (!fs.existsSync(FILE_PATH)) {
                const sheet = this.workbook.addWorksheet(SHEET_NAME);
                sheet.columns = EXCEL_COLUMNS;
                await this.workbook.xlsx.writeFile(FILE_PATH);
            }
        } catch (err) {
            logger.error('[StorageService] Error during Excel file initialization:', err);
            throw err;
        }
    }

    /**
     * Saves logs to both Excel and the external API.
     * Failed write to one sink does not fail the other.
     * Throws an error only if BOTH sinks fail.
     */
    async saveLogs(logs) {
        await this.ready;
        const normalizedLogs = normalizeLogs(logs);

        const [excelResult, apiResult] = await Promise.allSettled([
            this._saveToExcel(normalizedLogs),
            apiClient.sendLogs(normalizedLogs)
        ]);

        if (excelResult.status === 'rejected') {
            logger.error('[StorageService] Excel write failed:', excelResult.reason);
        }
        if (apiResult.status === 'rejected') {
            logger.error('[StorageService] External API forward failed:', apiResult.reason);
        }

        if (excelResult.status === 'rejected' && apiResult.status === 'rejected') {
            throw new Error('Both Excel write and external API forward failed');
        }
    }

    /**
     * Enqueues the Excel save operation to ensure sequential execution.
     */
    async _saveToExcel(logs) {
        this.excelWriteQueue = this.excelWriteQueue
            .catch(() => undefined) // Proceed even if previous write failed
            .then(() => this._saveToExcelInternal(logs));

        return this.excelWriteQueue;
    }

    /**
     * Performs the actual Excel file update and write.
     */
    async _saveToExcelInternal(logs) {
        if (fs.existsSync(FILE_PATH)) {
            await this.workbook.xlsx.readFile(FILE_PATH);
        } else {
            await this.initializeFile();
        }

        const sheet = this.workbook.getWorksheet(SHEET_NAME) || this.workbook.addWorksheet(SHEET_NAME);

        // Reassign column keys after reading, as exceljs doesn't persist key definitions
        sheet.columns = EXCEL_COLUMNS;

        logs.forEach(log => {
            sheet.addRow({
                timestamp: log.timestamp,
                user: log.user,
                prompt: log.prompt,
                url: log.url,
                conversationId: log.conversationId || '',
                provider: log.provider
            });
        });

        await this.workbook.xlsx.writeFile(FILE_PATH);
    }
}

module.exports = new StorageService();
