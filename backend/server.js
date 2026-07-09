require('dotenv').config();

const express = require('express');
const cors = require('cors');
const storageService = require('./services/storageService');
const logger = require('./utils/logger');
const { hasInvalidLogShape } = require('./utils/logNormalizer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/api/copilot/log', async (req, res) => {
    try {
        const payload = req.body;

        // Ensure payload is an array for batch processing
        const logs = Array.isArray(payload) ? payload : [payload];

        if (logs.length === 0) {
            return res.status(400).json({ success: false, message: 'Empty payload' });
        }

        if (hasInvalidLogShape(logs)) {
            return res.status(400).json({ success: false, message: 'Invalid payload format' });
        }

        await storageService.saveLogs(logs);

        res.json({ success: true });
    } catch (error) {
        logger.error('[API] Error saving logs:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    // Startup intentionally avoids noisy logs; runtime errors are still emitted.
    logger.info(`Backend server start at port ${PORT}`);
});

