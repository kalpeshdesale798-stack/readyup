import mongoose from "mongoose";

const topicSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true },
    subtopics: [{ type: String }],
    questionCount: { type: Number, default: 0 }
});

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        icon: {
            type: String,
            default: "Brain",
        },
        color: {
            type: String,
            default: "teal",
        },
        questionCount: {
            type: Number,
            default: 0,
        },
        topics: [topicSchema],
    },
    { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);

export default Category;
