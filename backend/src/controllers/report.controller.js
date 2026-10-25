const reportService = require('../services/report.service');

/**
 * Faculty submits a new completion report for an approved, concluded booking.
 * POST /api/reports
 */
const createReport = async (req, res, next) => {
  try {
    const report = await reportService.createCompletionReport(req.user.id, req.body);
    return res.status(201).json({
      status: 'success',
      message: 'Event completion report submitted successfully.',
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Faculty updates an existing completion report (e.g. revision requested).
 * PATCH /api/reports/:id
 */
const updateReport = async (req, res, next) => {
  try {
    const report = await reportService.updateCompletionReport(req.user.id, req.params.id, req.body);
    return res.status(200).json({
      status: 'success',
      message: 'Event completion report updated successfully.',
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Faculty views their own submitted completion reports.
 * GET /api/reports/my-reports
 */
const getFacultyReports = async (req, res, next) => {
  try {
    const result = await reportService.getFacultyReports(req.user.id, req.query);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve report associated with a specific booking (Faculty owner or Admin).
 * GET /api/reports/booking/:bookingId
 */
const getReportByBookingId = async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (isNaN(bookingId) || bookingId <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid booking ID.',
        statusCode: 400,
      });
    }

    const result = await reportService.getReportByBookingId(req.user.id, req.user.role, bookingId);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve a specific completion report by report ID.
 * GET /api/reports/:id
 */
const getReportById = async (req, res, next) => {
  try {
    const report = await reportService.getReportById(req.user.id, req.user.role, req.params.id);
    return res.status(200).json({
      status: 'success',
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Dean/Admin views all completion reports across campus.
 * GET /api/reports
 */
const getAllReportsAdmin = async (req, res, next) => {
  try {
    const result = await reportService.getAllReportsAdmin(req.query);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Dean reviews a completion report (approve as 'reviewed' or request 'revision_requested').
 * PATCH /api/reports/:id/review
 */
const reviewReport = async (req, res, next) => {
  try {
    const report = await reportService.reviewCompletionReport(req.user.id, req.params.id, req.body);
    const msg = report.status === 'reviewed'
      ? 'Completion report marked as reviewed.'
      : 'Revision requested from faculty member.';

    return res.status(200).json({
      status: 'success',
      message: msg,
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReport,
  updateReport,
  getFacultyReports,
  getReportByBookingId,
  getReportById,
  getAllReportsAdmin,
  reviewReport,
};
