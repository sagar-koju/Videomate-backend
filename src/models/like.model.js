import mongoose, {Schema} from 'mongoose';

const likeSchema = new Schema({
    comment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
    },
    video: {
        type: Schema.Types.ObjectId,
        ref: 'Video',
    },
    tweet: {
        type: Schema.Types.ObjectId,
        ref: 'Tweet',
    },
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    }
}, { timestamps: true });

// a unique index to ensure that a user can like a comment, video, or tweet only once
likeSchema.index(
    { comment: 1, likedBy: 1 },
    { 
        unique: true,
         partialFilterExpression: {
            comment: { $type: "objectId" }
        } 
    }
);
likeSchema.index(
    { video: 1, likedBy: 1 },
    { 
        unique: true, 
        partialFilterExpression: { 
            video: { $type: "objectId"}
        } 
    }
);
likeSchema.index(
    { tweet: 1, likedBy: 1 }, 
    { 
        unique: true, 
        partialFilterExpression: { 
            tweet: { $type: "objectId"}
        } 
    }
);

export const Like = mongoose.model('Like', likeSchema);