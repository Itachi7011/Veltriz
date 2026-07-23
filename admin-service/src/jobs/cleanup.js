const cron = require('node-cron');
const AdminAuditLog = require('../models/AdminAuditLog');
const logger = require('../utils/logger');

const daysToMs = (days) => days * 24 * 60 * 60 * 1000;

const runCleanup = async () => {
  try {
    const activityDays = parseInt(process.env.ADMIN_ACTIVITY_LOGS_RETENTION_DAYS, 10) || 90;
    const auditDays = parseInt(process.env.ADMIN_AUDIT_LOGS_RETENTION_DAYS, 10) || 90;

    const activityCutoff = new Date(Date.now() - daysToMs(activityDays));
    const auditCutoff = new Date(Date.now() - daysToMs(auditDays));

    const activityResult = await AdminAuditLog.deleteMany({
      logType: 'admin_activity',
      createdAt: { $lt: activityCutoff },
    });
    const auditResult = await AdminAuditLog.deleteMany({
      logType: 'admin_audit',
      createdAt: { $lt: auditCutoff },
    });

    logger.info(
      `[cleanup] Removed ${activityResult.deletedCount} admin_activity logs, ${auditResult.deletedCount} admin_audit logs`
    );
  } catch (err) {
    logger.error('[cleanup] Failed:', err.message);
  }
};

const scheduleCleanupJob = () => {
  if (process.env.ENABLE_SCHEDULED_CLEANUP !== 'true') {
    logger.info('[cleanup] Scheduled cleanup disabled via env');
    return;
  }

  if (process.env.RUN_CLEANUP_ON_STARTUP === 'true') {
    runCleanup();
  }

  cron.schedule('0 3 * * *', runCleanup);
  logger.info('[cleanup] Scheduled daily cleanup job at 03:00');
};

module.exports = { scheduleCleanupJob, runCleanup };
