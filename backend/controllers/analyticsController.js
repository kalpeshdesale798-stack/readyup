import Attempt from "../models/Attempt.js";
import Question from "../models/Question.js";

export const getStudentDashboard = async (req, res) => {
    try {
        const studentId = req.user._id;

        const completedAttempts = await Attempt.find({
            student: studentId,
            isSubmitted: true,
        }).sort({ createdAt: -1 });

        const testsCompleted = completedAttempts.length;

        let totalAccuracy = 0;
        let totalTimeSec = 0;
        let passedCount = 0;

        const topicAccuracyMap = {};

        completedAttempts.forEach((att) => {
            totalAccuracy += att.accuracy || 0;
            totalTimeSec += att.timeSpentSeconds || 0;
            if (att.result === "Passed") passedCount += 1;

            if (att.questions && att.questions.length > 0) {
                att.questions.forEach((q) => {
                    if (q.topic) {
                        if (!topicAccuracyMap[q.topic]) {
                            topicAccuracyMap[q.topic] = {
                                topic: q.topic,
                                category: q.category || "Quantitative Aptitude",
                                total: 0,
                                correct: 0,
                            };
                        }
                        topicAccuracyMap[q.topic].total += 1;
                        if (q.isCorrect) topicAccuracyMap[q.topic].correct += 1;
                    }
                });
            }
        });

        const avgAccuracy =
            testsCompleted > 0 ? Math.round(totalAccuracy / testsCompleted) : 0;
        const passRate =
            testsCompleted > 0 ? Math.round((passedCount / testsCompleted) * 100) : 0;
        const studyTimeHours =
            testsCompleted > 0
                ? Number((totalTimeSec / 3600).toFixed(1))
                : 0;

        // Determine Next Best Action based on lowest accuracy topic
        const topicList = Object.values(topicAccuracyMap);
        let lowestTopic = null;
        if (topicList.length > 0) {
            topicList.sort(
                (a, b) => a.correct / a.total - b.correct / b.total
            );
            lowestTopic = topicList[0];
        }

        const nextBestAction = lowestTopic
            ? {
                  label: "NEXT BEST ACTION",
                  title: `${lowestTopic.topic} Mastery Drill`,
                  description: `Your accuracy in ${lowestTopic.topic} is currently ${Math.round((lowestTopic.correct / lowestTopic.total) * 100)}%. Practice a curated 10-question set to build speed and accuracy.`,
                  topic: lowestTopic.topic,
                  targetTopic: lowestTopic.topic,
                  category: lowestTopic.category,
                  targetCategory: lowestTopic.category,
                  currentAccuracy: Math.round((lowestTopic.correct / lowestTopic.total) * 100),
                  targetAccuracy: 85,
                  ctaText: "Start Practice →",
                  reason: "Identified as your lowest-scoring topic based on recent performance",
              }
            : {
                  label: "NEXT BEST ACTION",
                  title: "Time and Work Speed Drill",
                  description: "Solve a curated 10-question practice set to build core aptitude speed and accuracy for placement rounds.",
                  topic: "Time and Work",
                  targetTopic: "Time and Work",
                  category: "Quantitative Aptitude",
                  targetCategory: "Quantitative Aptitude",
                  currentAccuracy: 0,
                  targetAccuracy: 85,
                  ctaText: "Start Practice →",
                  reason: "Recommended starting topic to benchmark your aptitude skills",
              };

        // Weekly goal calculation (Monday to Sunday)
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
        startOfWeek.setHours(0, 0, 0, 0);

        const thisWeekCompleted = completedAttempts.filter(
            (a) => new Date(a.createdAt) >= startOfWeek
        ).length;

        const targetWeeklyTests = 4;
        const weeklyPercentage = Math.min(
            100,
            Math.round((thisWeekCompleted / targetWeeklyTests) * 100)
        );

        const recentAttempts = completedAttempts.slice(0, 5).map((att) => ({
            _id: att._id,
            id: att._id,
            attemptId: att._id,
            title: att.title,
            type: att.type,
            score: att.score,
            totalMarks: att.totalMarks || att.totalQuestions || 0,
            percentage: att.accuracy || 0,
            accuracy: att.accuracy || 0,
            submittedAt: att.submittedAt || att.createdAt,
            date: att.createdAt,
            passed: att.result === "Passed",
            status: att.result || "Needs Review",
            timeSpentMinutes: Math.round((att.timeSpentSeconds || 0) / 60),
        }));

        // Dynamic Weak & Strong topics calculated from real attempts
        const weakTopics = topicList
            .filter((t) => Math.round((t.correct / t.total) * 100) < 70)
            .map((t) => ({
                topic: t.topic,
                category: t.category,
                accuracy: Math.round((t.correct / t.total) * 100),
                totalQuestions: t.total,
                status: "Needs Practice",
            }));

        const strongTopics = topicList
            .filter((t) => Math.round((t.correct / t.total) * 100) >= 70)
            .map((t) => ({
                topic: t.topic,
                category: t.category,
                accuracy: Math.round((t.correct / t.total) * 100),
                totalQuestions: t.total,
                status: "Strong",
            }));

        const metricCards = [
            {
                id: "tests-completed",
                label: "Tests Completed",
                value: testsCompleted,
                subtext: "Across practice & mock tests",
                icon: "FileCheck",
                color: "teal",
            },
            {
                id: "avg-accuracy",
                label: "Average Accuracy",
                value: `${avgAccuracy}%`,
                subtext: "Placement benchmark: 75%+",
                icon: "Target",
                color: "emerald",
            },
            {
                id: "study-time",
                label: "Study Time",
                value: `${studyTimeHours} hrs`,
                subtext: "Time spent practicing",
                icon: "Clock",
                color: "amber",
            },
            {
                id: "pass-rate",
                label: "Pass Rate",
                value: `${passRate}%`,
                subtext: `${passedCount} of ${testsCompleted} passed`,
                icon: "Award",
                color: "indigo",
            },
        ];

        return res.json({
            success: true,
            message: "Student dashboard retrieved successfully",
            data: {
                student: {
                    _id: req.user._id,
                    name: req.user.name,
                    email: req.user.email,
                    department: req.user.department,
                    college: req.user.college,
                    graduationYear: req.user.graduationYear,
                    studentId: req.user.studentId,
                },
                metrics: {
                    testsCompleted,
                    averageAccuracy: avgAccuracy,
                    studyTimeHours,
                    passRate,
                },
                metricCards,
                nextBestAction,
                weeklyGoal: {
                    target: targetWeeklyTests,
                    current: thisWeekCompleted,
                    percentage: weeklyPercentage,
                },
                weeklyProgress: {
                    percentage: weeklyPercentage,
                    current: thisWeekCompleted,
                    target: targetWeeklyTests,
                    label: "Weekly Mock Test Goal",
                    subtext: `${Math.max(0, targetWeeklyTests - thisWeekCompleted)} test${targetWeeklyTests - thisWeekCompleted === 1 ? "" : "s"} remaining this week`,
                },
                recentAttempts,
                weakTopics,
                strongTopics,
                topicProgress: topicList.map((t) => ({
                    topic: t.topic,
                    category: t.category,
                    accuracy: Math.round((t.correct / t.total) * 100),
                    questionsAttempted: t.total,
                    status: Math.round((t.correct / t.total) * 100) >= 70 ? "Strong" : "Needs Practice",
                })),
            },
        });
    } catch (error) {
        console.error("getStudentDashboard error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to generate student dashboard analytics",
        });
    }
};
