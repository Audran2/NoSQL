const { MongoClient } = require("mongodb");
const users = require("./users");

const url = "mongodb://0.0.0.0:27017";
const client = new MongoClient(url);

const dbName = "social-network";

async function main() {
  await client.connect();
  console.log("Connected successfully to server");
  const db = client.db(dbName);
  const userCollection = db.collection("users");
  const postCollection = db.collection("posts");
  const commentCollection = db.collection("comments");

  const generateUserCollection = async () => {
    const userWithDate = users.map((user) => ({
      ...user,
      createdAt: new Date(),
    }));
    return userCollection.insertMany(userWithDate);
  };

  const dropUserCollection = async () => {
    return userCollection.deleteMany({});
  };

  const dropCommentCollection = async () => {
    return commentCollection.deleteMany({});
  };

  const deleteOneUser = (username) => userCollection.deleteOne({ username });

  const updateOneUsername = (username, nextUsername) =>
    userCollection.updateOne(
      { username },
      { $set: { username, nextUsername } }
    );

  const dropPostCollection = async () => {
    return postCollection.deleteMany({});
  };

  const getUserId = (username) => {
    return (user = userCollection.findOne(
      { username },
      { projection: { username: 0, avatar: 0, createdAt: 0 } }
    ));
  };

  const createOnePost = async (username, imageUrl, description) => {
    const user = await getUserId(username);
    return postCollection.insertOne({
      userId: user._id,
      imageUrl,
      description,
      createdAt: new Date(),
    });
  };

  const addCommentToPost = async (username, comment, postIndex) => {
    const user = await getUserId(username);
    const result = await commentCollection.insertOne({
      userId: user._id,
      comment,
      createdAt: new Date(),
    });
    const posts = await postCollection.find({}).toArray();
    await postCollection.updateOne(
      { _id: posts[postIndex]._id },
      { $push: { comments: result.insertedId } }
    );
  };

  const getPosts = async () => {
    const posts = await postCollection
      .aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $project: { userId: 0}},
        {
          $lookup: {
            from: "comments",
            localField: "comments",
            foreignField: "_id",
            as: "comments",
            pipeline: [
              {
                $lookup: {
                  from: "users",
                  localField: "userId",
                  foreignField: "_id",
                  as: "user",
                },
              },
              { $unwind: "$user" },
              { $project: { userId: 0}},
            ]
          },
        },
      ])
      .toArray();

    console.log(posts);
  };

  await dropUserCollection();
  await dropPostCollection();
  await dropCommentCollection();
  await generateUserCollection();
  await createOnePost(
    "Martin Safran",
    "https://www.australia-australie.com/wp-content/uploads/2016/10/quokkas.jpg",
    "jhgkudjsflhfskfgjùgldfmlhjd"
  );
  await createOnePost(
    "Jean Eude",
    "https://www.australia-australie.com/wp-content/uploads/2016/10/quokkas.jpg",
    "jhgkudjsflhfskfgjùgldfmlhjd"
  );
  await addCommentToPost("Martin Safran", "kjghfdgldgfsdgmlhdkjhkf", 0);
  await addCommentToPost(
    "Martin Safran",
    "fgdmsfrgsosigofdjmgdjhkdgjhfmdgkj",
    1
  );
  await getPosts();

  return "done.";
}

main()
  .then(console.log)
  .catch(console.error)
  .finally(() => client.close());
