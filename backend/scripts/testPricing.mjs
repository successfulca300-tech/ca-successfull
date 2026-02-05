import { calculatePrice } from '../utils/testSeriesPricingService.js';

const pricing = { subjectPrice: 1200, comboPrice: 3600, allSubjectsPrice: 6000 };

for (let n = 1; n <= 5; n++) {
  const selectedSubjects = Array.from({ length: n }, (_, i) => `S${i}`);
  const result = calculatePrice({ seriesType: 'S4', selectedSubjects, pricing });
  console.log(`S4 | subjects=${n} -> basePrice=${result.basePrice}, finalPrice=${result.finalPrice}, appliedRule=${result.appliedRule}, pricePerSubject=${result.breakdown.pricePerSubject}`);
}
