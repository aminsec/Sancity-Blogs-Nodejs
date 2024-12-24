const {Sequelize, DataTypes, TEXT} = require("sequelize");
const sequelize = new Sequelize(
    'sancity',
    'root',
    process.env.DB_PASS,
     {
       host: 'localhost',
       dialect: 'mysql'
     }
   );
sequelize.authenticate().then(() => {
    console.log("Connected to database");
}).catch(() => {
    console.log("Couldn't connect to database!");
})

//Defining tables
const usersTB = sequelize.define("users", {
    userid: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },

    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    email: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    joinDate: {
        type: DataTypes.STRING,
        defaultValue: "1726745639519",
        allowNull: false,
    },

    role: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    likedPosts: {
        type: DataTypes.STRING,
        defaultValue: "0"
    },

    likedComments: {
        type: DataTypes.STRING,
        defaultValue: "0"
    },

    savedPosts: {
        type: DataTypes.STRING,
        defaultValue: "0"
    },
    profilePic: {
        type: DataTypes.STRING,
        defaultValue: "/api/v1/profilePics/ProfileDefault.png"
    },

    bio: {
        type: DataTypes.STRING
    },

    ai_requests: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    timestamps: false
});

const blogsTB = sequelize.define("blogs", {
    blog_content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },

    blog_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    blog_image: {
        type: DataTypes.STRING,
        defaultValue: "/api/v1/profilePics/defaultBanner.jpg"
    },

    blog_thumbnail: {
        type: DataTypes.STRING,
        defaultValue: "/api/v1/profilePics/default-thumbnail.jpg",
        allowNull: false
    },

    blog_title: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    is_public: {
        type: DataTypes.TINYINT,
        allowNull: false,
    },

    userid: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    isCommentOff: {
        type: DataTypes.TINYINT,
        allowNull: false
    },
    showLikes: {
        type: DataTypes.TINYINT,
        allowNull: false
    },
    likes: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    createdAt: {
        type: DataTypes.STRING,
        defaultValue: "1726745639519"
    },

    blog_magicToken: {
        type: DataTypes.STRING,
        defaultValue: null
    },

    magicToken_exp: {
        type: DataTypes.STRING,
        defaultValue: "0"
    },

    tags: {
        type: DataTypes.STRING
    }
}, {
    timestamps: false
});

const commentsTB = sequelize.define("comments", {
    blog_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },

    comment_text: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    commentedAt: {
        type: DataTypes.STRING,
        defaultValue: "1726745639519",
        allowNull: false,
    },

    commentLikes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },

    commentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },

    userid: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: false
});

const notificationsTB = sequelize.define("notifications", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },

    userid: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    acted_userid: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    action_name: {
        type: DataTypes.STRING,
        allowNull: false
    },

    blog_id: {
        type: DataTypes.INTEGER
    },

    comment_id: {
        type: DataTypes.INTEGER
    },

    seen: {
        type: DataTypes.TINYINT,
        allowNull: false
    },

    timestamp: {
        type: DataTypes.STRING,
        allowNull: false
    },

    notif_title: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: false
})

const dead_sessionsTB = sequelize.define("dead_sessions", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    session: {
        type: DataTypes.STRING
    },

    timestamp: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: false
});

const messagesTB = sequelize.define("messages", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },

    sender: {
        type: DataTypes.STRING,
        allowNull: false
    },

    receiver: {
        type: DataTypes.STRING,
        allowNull: false
    },

    message: {
        type: TEXT('medium')
    },

    timestamp: {
        type: DataTypes.STRING,
        allowNull: false
    },
}, {
    timestamps: false
});

const generated_ai_blogsTB = sequelize.define("generated_ai_blogs", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },

    subject: {
        type: DataTypes.STRING,
        allowNull: false
    },

    createdAt: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: false
});

sequelize.sync();

exports.usersTB = usersTB;
exports.commentsTB = commentsTB;
exports.blogsTB = blogsTB;
exports.messagesTB = messagesTB;
exports.notificationsTB = notificationsTB;
exports.dead_sessionsTB = dead_sessionsTB;
exports.generated_ai_blogsTB = generated_ai_blogsTB;
exports.sequelize = sequelize;