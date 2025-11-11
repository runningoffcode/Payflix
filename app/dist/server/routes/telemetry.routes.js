"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const telemetry_service_1 = require("../services/telemetry.service");
const router = (0, express_1.Router)();
router.post('/digital-id', (req, res) => {
    const { eventType } = req.body || {};
    if (eventType !== 'hover' && eventType !== 'modal_open') {
        return res.status(400).json({ error: 'Invalid event type' });
    }
    (0, telemetry_service_1.recordDigitalIdInteraction)(eventType);
    res.json({ success: true });
});
router.get('/digital-id', (_req, res) => {
    res.json((0, telemetry_service_1.getDigitalIdMetrics)());
});
exports.default = router;
