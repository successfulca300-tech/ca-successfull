import TestSeries from '../models/TestSeries.js';

// GET /api/testseries/fixed/:fixedId - return managed TestSeries for a fixed id (S1..S4) if it exists
export const getFixedManagedSeries = async (req, res) => {
  try {
    const { fixedId } = req.params;
    if (!fixedId) return res.status(400).json({ success: false, message: 'Invalid fixed id' });

    // First try to find a managed TestSeries by fixedKey (case-insensitive)
    let series = await TestSeries.findOne({ fixedKey: { $regex: `^${fixedId}$`, $options: 'i' } });
    if (series) return res.json({ success: true, testSeries: series });

    // Fallback: if fixedId includes prefix like 'inter-s1', extract series type part
    const parts = String(fixedId || '').split('-').filter(Boolean);
    const seriesTypePart = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    const seriesType = String(seriesTypePart || '').toUpperCase(); // e.g., 's1' -> 'S1'
    series = await TestSeries.findOne({ seriesType });
    if (!series) return res.json({ success: true, testSeries: null });

    return res.json({ success: true, testSeries: series });
  } catch (err) {
    console.error('[getFixedManagedSeries] Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/testseries/fixed/:fixedId/manage - upsert managed TestSeries (subadmin only)
export const upsertFixedTestSeries = async (req, res) => {
  try {
    const { fixedId } = req.params;
    if (!fixedId) return res.status(400).json({ success: false, message: 'Invalid fixed id' });

    const body = req.body || {};

    // Try to find by fixedKey first (supports 'inter-s1'), else by seriesType
    let testSeries = await TestSeries.findOne({ fixedKey: { $regex: `^${fixedId}$`, $options: 'i' } });
    if (!testSeries) {
      const parts = String(fixedId || '').split('-').filter(Boolean);
      const seriesTypePart = parts.length > 1 ? parts[parts.length - 1] : parts[0];
      const seriesType = String(seriesTypePart || '').toUpperCase();
      testSeries = await TestSeries.findOne({ seriesType });
    }

    if (!testSeries) {
      // Determine seriesType for creation (last segment of fixedId)
      const parts = String(fixedId || '').split('-').filter(Boolean);
      const seriesTypePart = parts.length > 1 ? parts[parts.length - 1] : parts[0];
      const seriesType = String(seriesTypePart || '').toUpperCase();
      // Derive examLevel from fixedId prefix
      const derivedExamLevel = String(fixedId || '').toLowerCase().startsWith('inter-') ? 'inter' : 'final';

      testSeries = new TestSeries({
        fixedKey: fixedId,
        seriesType,
        seriesTypeLabel: body.seriesTypeLabel || undefined,
        title: body.title || body.cardTitle || `Series ${seriesType}`,
        overview: body.overview || body.description || body.cardDescription || '',
        description: body.description || body.cardDescription || '',
        subjects: body.subjects || [],
        pricing: body.pricing || {},
        highlights: body.highlights || [],
        syllabusBreakdown: body.syllabusBreakdown || '',
        testSchedule: body.testSchedule || [],
        seriesDates: body.seriesDates || {},
        papersPerSubject: body.papersPerSubject || {},
        subjectDateSchedule: body.subjectDateSchedule || [],
        cardThumbnail: body.cardThumbnail || body.thumbnail || '',
        thumbnail: body.thumbnail || '',
        cardTitle: body.cardTitle || body.title || `Series ${seriesType}`,
        cardDescription: body.cardDescription || body.description || '',
        disclaimer: body.disclaimer || body.instructions || '',
        createdBy: req.user?._id,
        publishStatus: 'published',
        isActive: body.isActive !== undefined ? body.isActive : true,
        examLevel: body.examLevel || derivedExamLevel,
      });
    } else {
      const updatables = [
        'title', 'overview', 'description', 'subjects', 'pricing', 'highlights', 'syllabusBreakdown',
        'testSchedule', 'instructions', 'papersPerSubject', 'sampleAnswerSheets',
        'cardThumbnail', 'thumbnail', 'cardTitle', 'cardDescription', 'isActive', 'disclaimer', 'subjectDateSchedule', 'pricing', 'category'
      ];
      updatables.forEach((key) => {
        if (body[key] !== undefined) testSeries[key] = body[key];
      });
      // Handle seriesDates separately: merge non-empty values to avoid accidental clearing
      if (body.seriesDates && typeof body.seriesDates === 'object') {
        testSeries.seriesDates = testSeries.seriesDates || {};
        Object.keys(body.seriesDates).forEach((k) => {
          const v = body.seriesDates[k];
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            testSeries.seriesDates[k] = v;
          }
        });
      }
      // Ensure fixedKey remains set for prefixed fixed entries
      if (!testSeries.fixedKey) testSeries.fixedKey = fixedId;
      testSeries.publishStatus = 'published';
      if (body.isActive !== undefined) testSeries.isActive = body.isActive;
      if (body.disclaimer !== undefined) testSeries.disclaimer = body.disclaimer;
      if (body.subjectDateSchedule !== undefined) testSeries.subjectDateSchedule = body.subjectDateSchedule;
      if (body.overview !== undefined) testSeries.overview = body.overview;
    }

    const saved = await testSeries.save();
    const populated = await TestSeries.findById(saved._id);
    return res.json({ success: true, testSeries: populated });
  } catch (err) {
    console.error('[upsertFixedTestSeries] Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
