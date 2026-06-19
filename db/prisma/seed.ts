import { PrismaClient, InsightType, SessionQuality } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';

const prisma = new PrismaClient();

const SEED_USER_EMAIL = 'founder@cortex.bio';
const TIMEZONE = 'America/Los_Angeles';
const DAYS_OF_HISTORY = 90;
const API_KEY_PEPPER = process.env.API_KEY_PEPPER ?? 'cortex-bio-dev-pepper';

function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(`${rawKey}:${API_KEY_PEPPER}`).digest('hex');
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function dateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function atHour(date: Date, hour: number, minute = 0): Date {
  const d = new Date(date);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log('🌱 Seeding Cortex Bio database...');

  await prisma.$transaction([
    prisma.insight.deleteMany(),
    prisma.prediction.deleteMany(),
    prisma.dailyLabel.deleteMany(),
    prisma.cortexDailyMetric.deleteMany(),
    prisma.cognitiveWindow.deleteMany(),
    prisma.modelRun.deleteMany(),
    prisma.validationMetric.deleteMany(),
    prisma.predictionValidation.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.apiRequest.deleteMany(),
    prisma.performancePrediction.deleteMany(),
    prisma.workSession.deleteMany(),
    prisma.hourlyFeature.deleteMany(),
    prisma.dailyFeature.deleteMany(),
    prisma.workout.deleteMany(),
    prisma.sleepSession.deleteMany(),
    prisma.healthSample.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: SEED_USER_EMAIL,
      timezone: TIMEZONE,
      onboardingCompletedAt: addDays(new Date(), -85),
      chronotypeEstimate: JSON.stringify({
        classification: 'morning_lark',
        avgWakeHour: 6.2,
        avgSleepOnsetHour: 22.5,
        wakeTimeStdDevHours: 0.4,
        sampleDays: 60,
        confidence: 0.85,
      }),
    },
  });

  const today = dateOnly(new Date());
  const startDay = addDays(today, -(DAYS_OF_HISTORY - 1));

  const hrvValues: number[] = [];
  const sleepDurations: number[] = [];
  const readinessScores: number[] = [];
  const cortexByDay: Array<{
    date: Date;
    attention: number;
    deepWork: number;
    output: number;
  }> = [];

  for (let i = 0; i < DAYS_OF_HISTORY; i++) {
    const day = addDays(startDay, i);
    const dayUtc = dateOnly(day);

    // --- Sleep (realistic Apple Watch ranges) ---
    const sleepHours = rand(6.2, 8.6);
    const durationMinutes = sleepHours * 60;
    const efficiency = rand(0.78, 0.93);
    const asleepMinutes = durationMinutes * efficiency;
    const deepMinutes = asleepMinutes * rand(0.12, 0.22);
    const remMinutes = asleepMinutes * rand(0.18, 0.28);
    const coreMinutes = Math.max(0, asleepMinutes - deepMinutes - remMinutes);
    const awakeMinutes = Math.max(0, durationMinutes - asleepMinutes);

    const sleepEnd = atHour(day, randInt(6, 8), randInt(0, 45));
    const sleepStart = new Date(sleepEnd.getTime() - durationMinutes * 60_000);

    await prisma.sleepSession.create({
      data: {
        userId: user.id,
        sleepStart,
        sleepEnd,
        durationMinutes,
        remMinutes,
        deepMinutes,
        coreMinutes,
        awakeMinutes,
        sleepEfficiency: efficiency,
        sourceDevice: 'Apple Watch',
      },
    });

    sleepDurations.push(sleepHours);

    // --- Morning HRV & resting HR ---
    const hrv = rand(42, 78);
    const restingHr = rand(52, 66);
    hrvValues.push(hrv);

    const morningTime = atHour(day, randInt(6, 9), randInt(0, 30));

    await prisma.healthSample.createMany({
      data: [
        {
          userId: user.id,
          metricType: 'hrv',
          value: hrv,
          unit: 'ms',
          startTime: morningTime,
          endTime: morningTime,
          sourceDevice: 'Apple Watch',
          sourceApp: 'Health',
        },
        {
          userId: user.id,
          metricType: 'resting_heart_rate',
          value: restingHr,
          unit: 'bpm',
          startTime: morningTime,
          endTime: morningTime,
          sourceDevice: 'Apple Watch',
          sourceApp: 'Health',
        },
      ],
    });

    // --- Activity ---
    const steps = randInt(4500, 12500);
    const activeCalories = rand(280, 720);
    const exerciseMinutes = randInt(0, 65);

    await prisma.healthSample.createMany({
      data: [
        {
          userId: user.id,
          metricType: 'steps',
          value: steps,
          unit: 'count',
          startTime: atHour(day, 23, 59),
          sourceDevice: 'Apple Watch',
          sourceApp: 'Health',
        },
        {
          userId: user.id,
          metricType: 'active_energy',
          value: activeCalories,
          unit: 'kcal',
          startTime: atHour(day, 23, 59),
          sourceDevice: 'Apple Watch',
          sourceApp: 'Health',
        },
        {
          userId: user.id,
          metricType: 'exercise_minutes',
          value: exerciseMinutes,
          unit: 'min',
          startTime: atHour(day, 23, 59),
          sourceDevice: 'Apple Watch',
          sourceApp: 'Health',
        },
      ],
    });

    // --- Occasional vitals ---
    if (i % 3 === 0) {
      await prisma.healthSample.create({
        data: {
          userId: user.id,
          metricType: 'respiratory_rate',
          value: rand(13.5, 17.5),
          unit: 'breaths/min',
          startTime: atHour(day, 7, 0),
          sourceDevice: 'Apple Watch',
          sourceApp: 'Health',
        },
      });
    }

    if (i % 5 === 0) {
      await prisma.healthSample.create({
        data: {
          userId: user.id,
          metricType: 'spo2',
          value: rand(96, 99),
          unit: '%',
          startTime: atHour(day, 7, 15),
          sourceDevice: 'Apple Watch',
          sourceApp: 'Health',
        },
      });
    }

    // --- Heart rate samples (4 per day) ---
    for (const hour of [8, 12, 16, 20]) {
      await prisma.healthSample.create({
        data: {
          userId: user.id,
          metricType: 'heart_rate',
          value: rand(58, 95),
          unit: 'bpm',
          startTime: atHour(day, hour, randInt(0, 59)),
          sourceDevice: 'Apple Watch',
          sourceApp: 'Health',
        },
      });
    }

    // --- Workouts (~3x per week) ---
    if ([1, 3, 5].includes(day.getUTCDay())) {
      const workoutDuration = randInt(30, 75);
      const workoutStart = atHour(day, randInt(6, 18), randInt(0, 30));
      const workoutEnd = new Date(workoutStart.getTime() + workoutDuration * 60_000);

      await prisma.workout.create({
        data: {
          userId: user.id,
          workoutType: ['running', 'strength_training', 'cycling'][randInt(0, 2)],
          startTime: workoutStart,
          endTime: workoutEnd,
          durationMinutes: workoutDuration,
          calories: rand(220, 580),
          avgHeartRate: rand(118, 155),
          maxHeartRate: rand(155, 178),
          sourceDevice: 'Apple Watch',
        },
      });
    }

    // --- Daily features (computed) ---
    const hrvBaseline =
      hrvValues.length >= 30
        ? hrvValues.slice(-30).reduce((a, b) => a + b, 0) / Math.min(30, hrvValues.length)
        : hrv;
    const hrvVsBaselinePct = ((hrv - hrvBaseline) / hrvBaseline) * 100;
    const sleepDebt = Math.max(0, 7.5 - sleepHours);

    let readiness = 70;
    if (sleepHours >= 7.5) readiness += 12;
    else if (sleepHours < 6.5) readiness -= 12;
    if (hrvVsBaselinePct >= 10) readiness += 10;
    else if (hrvVsBaselinePct <= -10) readiness -= 10;
    if (exerciseMinutes > 50) readiness -= 4;
    readiness = Math.max(35, Math.min(95, readiness + rand(-5, 5)));
    readinessScores.push(readiness);

    const featureConfidence = sleepHours > 0 && hrv > 0 ? rand(0.75, 0.98) : rand(0.4, 0.6);

    await prisma.dailyFeature.create({
      data: {
        userId: user.id,
        date: dayUtc,
        sleepDuration: sleepHours,
        sleepEfficiency: efficiency,
        sleepDebtHours: sleepDebt,
        avgHrv: hrv,
        hrvVsBaselinePct,
        restingHr,
        steps,
        exerciseMinutes,
        activeCalories,
        readinessScore: null,
        checkinCount: 1,
        featureConfidence,
      },
    });

    const sleepFactor = Math.min(1, sleepHours / 8);
    const hrvFactor = Math.min(1, hrv / 70);
    const base = 2 + sleepFactor * 1.5 + hrvFactor * 1.2;
    const noise = () => Math.max(1, Math.min(5, Math.round(base + rand(-1, 1))));

    await prisma.dailyLabel.create({
      data: {
        userId: user.id,
        date: dayUtc,
        productivityScore: noise(),
        energyScore: noise(),
        focusScore: noise(),
        moodScore: noise(),
      },
    });

    const attention = Math.min(
      100,
      Math.max(30, 35 + sleepHours * 6 + hrv * 0.35 + rand(-4, 4)),
    );
    const deepWork = Math.max(30, sleepHours * 22 + exerciseMinutes * 1.5 + rand(-20, 20));
    const output = Math.min(100, attention * 0.85 + rand(-5, 5));

    await prisma.cortexDailyMetric.create({
      data: {
        userId: user.id,
        date: dayUtc,
        deepWorkMinutes: deepWork,
        attentionScore: attention,
        contextSwitches: randInt(8, 45),
        codingMinutes: deepWork * rand(0.3, 0.6),
        writingMinutes: deepWork * rand(0.1, 0.3),
        researchMinutes: deepWork * rand(0.1, 0.25),
        meetingMinutes: randInt(0, 90),
        outputScore: output,
      },
    });

    cortexByDay.push({ date: dayUtc, attention, deepWork, output });

    // --- Hourly features (peak hours only) ---
    for (const hour of [8, 9, 10, 11, 13, 14, 15, 16, 17]) {
      const activityScore = hour >= 9 && hour <= 11 ? rand(0.7, 0.95) : hour === 13 ? rand(0.3, 0.5) : rand(0.45, 0.75);

      await prisma.hourlyFeature.create({
        data: {
          userId: user.id,
          timestampHour: atHour(day, hour, 0),
          avgHeartRate: rand(58, 88),
          avgHrv: hour <= 10 ? rand(45, 72) : rand(38, 60),
          steps: randInt(200, 1800),
          activityScore,
        },
      });
    }
  }

  // --- Predictions (last 30 days) ---
  for (let i = 0; i < 30; i++) {
    const predictionDate = addDays(today, -i);
    const dayUtc = dateOnly(predictionDate);
    const predicted = readinessScores[DAYS_OF_HISTORY - 1 - i] ?? rand(60, 88);
    const actual = predicted + rand(-8, 8);

    const peakStart = atHour(predictionDate, 9, 15);
    const peakEnd = atHour(predictionDate, 11, 45);
    const secondaryStart = atHour(predictionDate, 15, 0);
    const secondaryEnd = atHour(predictionDate, 16, 30);
    const crashStart = atHour(predictionDate, 13, 0);
    const crashEnd = atHour(predictionDate, 14, 0);

    await prisma.prediction.create({
      data: {
        userId: user.id,
        predictionDate: dayUtc,
        readinessScore: predicted,
        peakWindowStart: peakStart,
        peakWindowEnd: peakEnd,
        secondaryWindowStart: secondaryStart,
        secondaryWindowEnd: secondaryEnd,
        crashWindowStart: crashStart,
        crashWindowEnd: crashEnd,
        confidence: rand(0.55, 0.85),
        modelVersion: 'rules-v1',
        actualScore: Math.max(30, Math.min(100, actual)),
        predictionError: Math.abs(predicted - actual),
        featureSnapshot: {
          engine: 'rules-v1',
          sleep_hours: sleepDurations[DAYS_OF_HISTORY - 1 - i],
        },
      },
    });
  }

  // --- Insights (10) ---
  const insights: Array<{
    insightType: InsightType;
    title: string;
    description: string;
    metricName: string;
    impactPct: number;
    confidence: number;
  }> = [
    {
      insightType: InsightType.top_driver,
      title: 'Best Focus Driver: Sleep Consistency',
      description: 'Nights with 7.5+ hours correlate with higher readiness scores.',
      metricName: 'sleep_duration',
      impactPct: 27,
      confidence: 0.72,
    },
    {
      insightType: InsightType.hrv_impact,
      title: 'HRV Above Baseline Boosts Readiness',
      description: 'Morning HRV >10% above your 30-day baseline predicts +18% readiness.',
      metricName: 'avg_hrv',
      impactPct: 18,
      confidence: 0.68,
    },
    {
      insightType: InsightType.peak_hour,
      title: 'Historical Peak Focus Window',
      description: 'Your highest activity scores cluster between 10 AM and 12 PM.',
      metricName: 'activity_score',
      impactPct: 0,
      confidence: 0.81,
    },
    {
      insightType: InsightType.crash_window,
      title: 'Common Energy Crash',
      description: 'Activity scores dip consistently between 1:00 PM and 2:30 PM.',
      metricName: 'activity_score',
      impactPct: -22,
      confidence: 0.74,
    },
    {
      insightType: InsightType.chronotype,
      title: 'Morning Lark Chronotype',
      description: 'Wake times and peak focus suggest a morning-oriented circadian profile.',
      metricName: 'chronotype_estimate',
      impactPct: 0,
      confidence: 0.65,
    },
    {
      insightType: InsightType.sleep_impact,
      title: 'Sleep Debt Accumulation',
      description: 'Three consecutive nights under 7 hours precedes readiness drops >15 points.',
      metricName: 'sleep_debt_hours',
      impactPct: -15,
      confidence: 0.7,
    },
    {
      insightType: InsightType.activity_impact,
      title: 'Moderate Activity Supports Focus',
      description: 'Days with 8,000–10,000 steps show optimal readiness, not max steps.',
      metricName: 'steps',
      impactPct: 11,
      confidence: 0.6,
    },
    {
      insightType: InsightType.trend,
      title: 'HRV Trend Improving',
      description: '30-day HRV baseline increased 8% over the last quarter.',
      metricName: 'avg_hrv',
      impactPct: 8,
      confidence: 0.58,
    },
    {
      insightType: InsightType.top_driver,
      title: 'Deep Sleep Correlates with Peak Windows',
      description: 'Nights with >90 min deep sleep align with longer peak focus windows.',
      metricName: 'deep_minutes',
      impactPct: 14,
      confidence: 0.63,
    },
    {
      insightType: InsightType.crash_window,
      title: 'Post-Workout Afternoon Dip',
      description: 'Hard workouts before noon predict a stronger 1 PM energy crash.',
      metricName: 'exercise_minutes',
      impactPct: -12,
      confidence: 0.55,
    },
  ];

  const validFrom = addDays(today, -30);

  for (const insight of insights) {
    await prisma.insight.create({
      data: {
        userId: user.id,
        insightType: insight.insightType,
        title: insight.title,
        description: insight.description,
        metricName: insight.metricName,
        impactPct: insight.impactPct,
        confidence: insight.confidence,
        validFrom: dateOnly(validFrom),
      },
    });
  }

  // --- Phase 7/9: Performance predictions + validation backfill (last 30 days) ---
  const validationDays = cortexByDay.slice(-30);
  const modelVersion = 'xgb-v1';

  for (const day of validationDays) {
    const predictedAttention = Math.min(100, Math.max(30, day.attention + rand(-7, 7)));
    const predictedDeepWork = Math.max(20, day.deepWork + rand(-20, 20));
    const predictedOutput = Math.min(100, Math.max(20, day.output + rand(-5, 5)));

    await prisma.performancePrediction.create({
      data: {
        userId: user.id,
        predictionDate: day.date,
        predictedAttention,
        predictedDeepWorkMinutes: predictedDeepWork,
        predictedOutputScore: predictedOutput,
        confidence: rand(0.65, 0.92),
        modelVersion,
        featureSnapshot: { engine: modelVersion, date: day.date.toISOString().slice(0, 10) },
      },
    });

    const targets = [
      { type: 'attention', predicted: predictedAttention, actual: day.attention },
      { type: 'deep_work', predicted: predictedDeepWork, actual: day.deepWork },
      { type: 'output', predicted: predictedOutput, actual: day.output },
    ] as const;

    for (const t of targets) {
      const absErr = Math.abs(t.predicted - t.actual);
      await prisma.predictionValidation.create({
        data: {
          userId: user.id,
          modelVersion,
          predictionDate: day.date,
          targetType: t.type,
          predictedValue: t.predicted,
          actualValue: t.actual,
          absoluteError: absErr,
          percentageError: t.actual === 0 ? null : Math.round((absErr / t.actual) * 1000) / 10,
        },
      });
    }
  }

  const rangeStart = validationDays[0]!.date;
  const rangeEnd = validationDays[validationDays.length - 1]!.date;

  for (const targetType of ['attention', 'deep_work', 'output'] as const) {
    const rows = await prisma.predictionValidation.findMany({
      where: { userId: user.id, modelVersion, targetType },
    });
    const errors = rows.map((r) => r.absoluteError);
    const mae = errors.reduce((s, e) => s + e, 0) / errors.length;
    const rmse = Math.sqrt(errors.reduce((s, e) => s + e ** 2, 0) / errors.length);
    const predicted = rows.map((r) => r.predictedValue);
    const actual = rows.map((r) => r.actualValue);
    const meanP = predicted.reduce((s, v) => s + v, 0) / predicted.length;
    const meanA = actual.reduce((s, v) => s + v, 0) / actual.length;
    let corrNum = 0;
    let corrDenP = 0;
    let corrDenA = 0;
    for (let i = 0; i < rows.length; i++) {
      const dp = predicted[i]! - meanP;
      const da = actual[i]! - meanA;
      corrNum += dp * da;
      corrDenP += dp ** 2;
      corrDenA += da ** 2;
    }
    const correlation =
      corrDenP && corrDenA ? corrNum / Math.sqrt(corrDenP * corrDenA) : null;

    await prisma.validationMetric.create({
      data: {
        userId: user.id,
        modelVersion,
        targetType,
        dateRangeStart: rangeStart,
        dateRangeEnd: rangeEnd,
        mae: Math.round(mae * 100) / 100,
        rmse: Math.round(rmse * 100) / 100,
        correlation: correlation != null ? Math.round(correlation * 1000) / 1000 : null,
        beatsBaselines: mae < 12,
        baselineMae: {
          yesterday: mae * rand(0.9, 1.15),
          rolling7: mae * rand(0.95, 1.1),
          readiness: mae * rand(1.05, 1.35),
        },
        sampleCount: rows.length,
      },
    });
  }

  await prisma.modelRun.create({
    data: {
      userId: user.id,
      modelVersion,
      trainingStart: dateOnly(addDays(today, -60)),
      trainingEnd: dateOnly(addDays(today, -8)),
      status: 'below_baseline',
      mae: { attention: 5.8, deep_work: 18.2, output: 4.1 },
      rmse: { attention: 7.4, deep_work: 22.1, output: 5.3 },
      featureImportance: {
        attention: {
          sleep_duration: 0.22,
          avg_hrv: 0.19,
          hrv_vs_baseline_pct: 0.15,
          sleep_efficiency: 0.12,
          readiness_score: 0.1,
          steps: 0.08,
          exercise_minutes: 0.07,
          resting_hr: 0.04,
          weekday: 0.02,
          chronotype_enc: 0.01,
        },
        deep_work: {
          sleep_duration: 0.25,
          exercise_minutes: 0.18,
          avg_hrv: 0.14,
          steps: 0.12,
          sleep_efficiency: 0.1,
          readiness_score: 0.08,
          hrv_vs_baseline_pct: 0.07,
          resting_hr: 0.04,
          weekday: 0.02,
          chronotype_enc: 0.0,
        },
        output: {
          sleep_duration: 0.2,
          avg_hrv: 0.18,
          sleep_efficiency: 0.15,
          readiness_score: 0.12,
          hrv_vs_baseline_pct: 0.11,
          exercise_minutes: 0.09,
          steps: 0.07,
          resting_hr: 0.05,
          weekday: 0.02,
          chronotype_enc: 0.01,
        },
      },
      baselineComparison: {
        attention: { model_mae: 5.8, yesterday_mae: 6.4, rolling7_mae: 6.1, readiness_mae: 8.9 },
        deep_work: { model_mae: 18.2, yesterday_mae: 19.5, rolling7_mae: 18.8, readiness_mae: 24.1 },
        output: { model_mae: 4.1, yesterday_mae: 4.8, rolling7_mae: 4.5, readiness_mae: 6.2 },
      },
      beatsBaselines: false,
      sampleCount: 83,
    },
  });

  // --- Work sessions (ground truth, 120+ for Phase 1/2) ---
  const qualities: SessionQuality[] = ['great', 'good', 'average', 'poor'];
  const projects = ['Research', 'Coding', 'Writing', 'Reading', 'Meetings'];
  for (let i = 0; i < 120; i++) {
    const dayOffset = randInt(0, 89);
    const hour = i % 3 === 0 ? randInt(9, 11) : randInt(8, 17);
    const started = atHour(addDays(today, -dayOffset), hour, randInt(0, 45));
    const duration = randInt(30, 120);
    const qualityIdx = hour >= 9 && hour <= 11 ? randInt(1, 3) : randInt(0, 3);
    await prisma.workSession.create({
      data: {
        userId: user.id,
        startedAt: started,
        endedAt: new Date(started.getTime() + duration * 60_000),
        durationMinutes: duration,
        sessionQuality: qualities[qualityIdx],
        projectName: projects[randInt(0, projects.length - 1)],
      },
    });
  }

  const counts = {
    users: 1,
    healthSamples: await prisma.healthSample.count(),
    sleepSessions: await prisma.sleepSession.count(),
    workouts: await prisma.workout.count(),
    dailyFeatures: await prisma.dailyFeature.count(),
    dailyLabels: await prisma.dailyLabel.count(),
    cortexMetrics: await prisma.cortexDailyMetric.count(),
    hourlyFeatures: await prisma.hourlyFeature.count(),
    predictions: await prisma.prediction.count(),
    performancePredictions: await prisma.performancePrediction.count(),
    predictionValidations: await prisma.predictionValidation.count(),
    validationMetrics: await prisma.validationMetric.count(),
    insights: await prisma.insight.count(),
    workSessions: await prisma.workSession.count(),
  };

  console.log('✅ Seed complete:', counts);
  console.log(`   User: ${SEED_USER_EMAIL} (${user.id})`);

  const devApiKey = `cb_test_${randomBytes(24).toString('hex')}`;
  await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: 'seed-dev',
      keyPrefix: devApiKey.slice(0, 16),
      keyHash: hashApiKey(devApiKey),
      tier: 'free',
      rateLimit: 600,
    },
  });
  console.log(`   Dev API key (v1): ${devApiKey}`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
