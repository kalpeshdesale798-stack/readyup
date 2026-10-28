import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        question: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Question",
            required: true,
        },
        questionId: {
            type: String,
            required: true,
        },
        notes: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

bookmarkSchema.index({ student: 1, question: 1 }, { unique: true });

const Bookmark = mongoose.model("Bookmark", bookmarkSchema);

export default Bookmark;
