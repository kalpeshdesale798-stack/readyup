import Company from "../models/Company.js";
import Question from "../models/Question.js";
import MockTest from "../models/MockTest.js";

const escapeRegex = (string) => {
    return string ? string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
};

const formatHiringPatternSummary = (hp) => {
    if (!hp) return "Online Assessment: 60 mins • Quantitative, Logical & Verbal Aptitude";
    if (typeof hp === "string") return hp;
    const dur = hp.testDuration || 60;
    const count = hp.totalQuestions || 30;
    const sections = Array.isArray(hp.sections) && hp.sections.length > 0
        ? hp.sections.map((s) => (typeof s === "string" ? s : s.name)).filter(Boolean).join(", ")
        : "Quantitative, Logical & Verbal Aptitude";
    return `Online Assessment: ${dur} mins • ${count} Questions (${sections})`;
};

export const getCompanies = async (req, res) => {
    try {
        const companies = await Company.find().sort({ name: 1 });
        const normalizedMap = new Map();

        // 1. Ingest persisted Company documents
        for (const c of companies) {
            const cObj = c.toObject();
            const trimmedName = cObj.name.trim();
            const normKey = trimmedName.toLowerCase();
            normalizedMap.set(normKey, {
                ...cObj,
                name: trimmedName,
                slug: cObj.slug || normKey.replace(/[^a-z0-9]+/g, "-"),
            });
        }

        // 2. Discover distinct company tags from Question collection (case-normalized, whitespace trimmed)
        const distinctFromQuestions = await Question.distinct("companies", { isActive: true });
        if (Array.isArray(distinctFromQuestions)) {
            for (const rawName of distinctFromQuestions) {
                if (rawName && typeof rawName === "string" && rawName.trim()) {
                    const trimmed = rawName.trim();
                    const normKey = trimmed.toLowerCase();
                    if (!normalizedMap.has(normKey)) {
                        const slug = trimmed
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/(^-|-$)/g, "");

                        normalizedMap.set(normKey, {
                            _id: `dyn_${slug || normKey}`,
                            name: trimmed,
                            slug: slug || normKey,
                            tier: "Tier 1",
                            description: `Campus recruitment practice questions and aptitude assessments for ${trimmed}.`,
                            hiringPattern: {
                                testDuration: 60,
                                totalQuestions: 30,
                                sections: [
                                    { name: "Quantitative Aptitude", questionCount: 10, durationMinutes: 20 },
                                    { name: "Logical Reasoning", questionCount: 10, durationMinutes: 20 },
                                    { name: "Verbal Ability", questionCount: 10, durationMinutes: 20 },
                                ],
                            },
                            topicsFocus: ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"],
                            keyTopics: ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"],
                            tagline: "Campus Placement Hiring Drive",
                            badge: "Recruitment Drive",
                            accentColor: "#0D9488",
                        });
                    }
                }
            }
        }

        // 3. Enrich each distinct company with verified question count, assessment count, and top topics
        const combined = Array.from(normalizedMap.values());
        let enriched = await Promise.all(
            combined.map(async (cObj) => {
                const escapedName = escapeRegex(cObj.name);
                const [qCount, verifiedQCount, testCount, topTopicsAgg] = await Promise.all([
                    Question.countDocuments({
                        companies: new RegExp(`^${escapedName}$`, "i"),
                        isActive: true,
                    }),
                    Question.countDocuments({
                        companies: new RegExp(`^${escapedName}$`, "i"),
                        isVerified: true,
                        isActive: true,
                    }),
                    MockTest.countDocuments({
                        company: new RegExp(`^${escapedName}$`, "i"),
                        isActive: true,
                    }),
                    Question.aggregate([
                        { $match: { companies: new RegExp(`^${escapedName}$`, "i"), isActive: true } },
                        { $group: { _id: "$topic", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 4 },
                    ]),
                ]);

                cObj.questionCount = qCount;
                cObj.verifiedQuestionCount = verifiedQCount;
                cObj.assessmentCount = testCount;

                // Grounded verification: backed by faculty-verified questions in database or established partner status
                const isExplicitlyVerified = cObj.isVerified !== undefined ? Boolean(cObj.isVerified) : true;
                cObj.isVerified = isExplicitlyVerified && (verifiedQCount > 0 || qCount >= 5);

                // Grounded recruitment drive: has active campus drives configured or active placement mock tests
                const driveCount = typeof cObj.activeDrives === "number" ? cObj.activeDrives : (testCount > 0 ? 1 : 0);
                cObj.activeDrives = driveCount;
                cObj.hasActiveDrive = driveCount > 0;

                // Accurate badge assignment
                if (cObj.hasActiveDrive && testCount > 0) {
                    cObj.badge = "Recruitment Drive";
                } else if (cObj.isVerified) {
                    cObj.badge = "Verified";
                } else {
                    cObj.badge = "Standard";
                }

                if (topTopicsAgg && topTopicsAgg.length > 0) {
                    cObj.keyTopics = topTopicsAgg.map((t) => t._id).filter(Boolean);
                }
                cObj.hiringPatternSummary = formatHiringPatternSummary(cObj.hiringPattern);
                return cObj;
            })
        );

        // Apply server-side query filters if specified
        const { filter, verified, recruitmentDrive, search } = req.query;
        if (filter === "verified" || verified === "true") {
            enriched = enriched.filter((c) => c.isVerified === true);
        } else if (filter === "recruitment_drive" || filter === "drive" || recruitmentDrive === "true") {
            enriched = enriched.filter((c) => c.hasActiveDrive === true);
        }

        if (search && typeof search === "string" && search.trim()) {
            const q = search.trim().toLowerCase();
            enriched = enriched.filter(
                (c) =>
                    c.name.toLowerCase().includes(q) ||
                    (c.description && c.description.toLowerCase().includes(q)) ||
                    (c.keyTopics && c.keyTopics.some((t) => t.toLowerCase().includes(q)))
            );
        }

        // Sort alphabetically
        enriched.sort((a, b) => a.name.localeCompare(b.name));

        return res.json({
            success: true,
            message: "Companies retrieved successfully",
            data: enriched,
            total: enriched.length,
        });
    } catch (error) {
        console.error("getCompanies error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve companies",
        });
    }
};

export const getCompanyBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        if (!slug) {
            return res.status(400).json({ success: false, message: "Company slug is required" });
        }

        const normalizedSlug = slug.trim().toLowerCase();
        let company = await Company.findOne({ slug: normalizedSlug });

        let companyData;
        if (company) {
            companyData = company.toObject();
            companyData.name = companyData.name.trim();
        } else {
            // Match against Question collection
            const rawName = normalizedSlug.replace(/-/g, " ");
            const sample = await Question.findOne({
                companies: new RegExp(`^${escapeRegex(rawName)}$`, "i"),
                isActive: true,
            });

            if (!sample) {
                return res.status(404).json({
                    success: false,
                    message: "Company not found",
                });
            }

            const matchedName = sample.companies.find(
                (c) => c.trim().toLowerCase() === rawName.toLowerCase()
            ) || sample.companies[0] || rawName;

            companyData = {
                _id: `dyn_${normalizedSlug}`,
                name: matchedName.trim(),
                slug: normalizedSlug,
                tier: "Tier 1",
                description: `Campus recruitment practice questions and aptitude assessments for ${matchedName.trim()}.`,
                hiringPattern: {
                    testDuration: 60,
                    totalQuestions: 30,
                    sections: [
                        { name: "Quantitative Aptitude", questionCount: 10, durationMinutes: 20 },
                        { name: "Logical Reasoning", questionCount: 10, durationMinutes: 20 },
                        { name: "Verbal Ability", questionCount: 10, durationMinutes: 20 },
                    ],
                },
                topicsFocus: ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"],
                tagline: "Campus Placement Hiring Drive",
                badge: "Recruitment Drive",
                accentColor: "#0D9488",
            };
        }

        const escapedName = escapeRegex(companyData.name);
        const [questions, testCount, topTopicsAgg] = await Promise.all([
            Question.find({
                companies: new RegExp(`^${escapedName}$`, "i"),
                isActive: true,
            }).select("-correctOption -explanation"),
            MockTest.countDocuments({
                company: new RegExp(`^${escapedName}$`, "i"),
                isActive: true,
            }),
            Question.aggregate([
                { $match: { companies: new RegExp(`^${escapedName}$`, "i"), isActive: true } },
                { $group: { _id: "$topic", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
            ]),
        ]);

        companyData.questionCount = questions.length;
        companyData.assessmentCount = testCount;
        companyData.sampleQuestions = questions.slice(0, 5);
        if (topTopicsAgg && topTopicsAgg.length > 0) {
            companyData.keyTopics = topTopicsAgg.map((t) => t._id).filter(Boolean);
        }
        companyData.hiringPatternSummary = formatHiringPatternSummary(companyData.hiringPattern);
        companyData.testPattern = companyData.hiringPatternSummary || "Aptitude Assessment";

        return res.json({
            success: true,
            message: "Company details retrieved successfully",
            data: companyData,
        });
    } catch (error) {
        console.error("getCompanyBySlug error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve company details",
        });
    }
};
