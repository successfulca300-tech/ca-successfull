import TestSeries from '../models/TestSeries.js';

// GET /api/testseries/fixed/:fixedId - return managed TestSeries for a fixed id (S1..S4) if it exists
export const getFixedManagedSeries = async (req, res) => {
  try {
    const { fixedId } = req.params;
    if (!fixedId) return res.status(400).json({ success: false, message: 'Invalid fixed id' });

    const seriesType = String(fixedId || '').toUpperCase(); // e.g., 's1' -> 'S1'
    const series = await TestSeries.findOne({ seriesType });
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

    const seriesType = String(fixedId || '').toUpperCase();
    const body = req.body || {};

    let testSeries = await TestSeries.findOne({ seriesType });

    if (!testSeries) {
      testSeries = new TestSeries({
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
      });
    } else {
      const updatables = [
        'title', 'overview', 'description', 'subjects', 'pricing', 'highlights', 'syllabusBreakdown',
        'testSchedule', 'instructions', 'seriesDates', 'papersPerSubject', 'sampleAnswerSheets',
        'cardThumbnail', 'thumbnail', 'cardTitle', 'cardDescription', 'isActive', 'disclaimer', 'subjectDateSchedule', 'pricing', 'category'
      ];
      updatables.forEach((key) => {
        if (body[key] !== undefined) testSeries[key] = body[key];
      });
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
