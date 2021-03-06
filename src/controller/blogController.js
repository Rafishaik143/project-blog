const jwt = require('jsonwebtoken');

//Import Models
const blogModel = require("../Model/blogModel");
const authorModel = require("../Model/authorModel");


//create blog function
const createBlog = async function (req, res) {
  try {
    //Reading input from req.body
    const data = req.body;

    //Reading mandotory fields
    const auth = data.authorId;
    const title = data.title;
    const body = data.body;
    const category = data.category;

    if (!title) {
      return res.status(400).send({ status: false, msg: "Title is required" });
    }
    if (!body) {
      return res.status(400).send({ status: false, msg: "Body is required" });
    }
    if (!category) {
      return res.status(400).send({ status: false, msg: "Category is required" });
    }

    //blog validation
    bodylength = !/^.{20,}$/.test(body)

    if (bodylength) {
      return res.status(400).send({ status: false, msg: "Body should be of minimum 20 characters" })
    }

    //authorId validation
    validauthorId = !/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/.test(auth)

    if (validauthorId) {
      return res.status(400).send({ status: false, msg: "Invalid authorId" })
    }

    //authorId validation
    const id = await authorModel.findById(auth);
    if (!id) {
      return res
        .status(404)
        .send({ status: false, msg: "Author does not exist" });
    }

    //create blog
    const blog = await blogModel.create(data);

    //add published date if its published
    if (blog.isPublished) {
      blog.publishedAt = new Date(Date.now())
      blog.save()
    }

    //add deleted date if its deleted
    if (blog.isDeleted) {
      blog.deletedAt = new Date(Date.now())
      blog.save()
    }

    res.status(201).send({ status: true, data: blog });

  } catch (error) {
    res.status(500).send({ status: false, msg: error.message });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////

//get all published blogs which are not deleted
const getblog = async function (req, res) {
  try {

    //Reading input from req.query 
    const query = req.query;
    console.log(query)
    if (Object.keys(query) != 0) {

      const cat = query.category;
      const subcat = query.subcategory;
      const tag = query.tags;
      const id = query.authorId;

      //filter by authorId
      if (id) {
        //validate authorId
        let validid = !/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/.test(id)
        if (validid) {
          return res.status(400).send({ status: false, msg: "enter valid authorId" })
        }

        const validauthor = await authorModel.findById({ _id: id }).select({ _id: 1 });
        if (!validauthor) {
          return res
            .status(404)
            .send({ status: false, msg: "Author does not exist" });
        }
      }

      //filter by category
      if (cat) {
        const validcat = await blogModel.find({ category: cat });
        console.log(validcat)
        if (validcat.length == 0) {
          return res
            .status(404)
            .send({ status: false, msg: "category does not exist " });
        }
      }

      //filter by tag
      if (tag) {
        const validtag = await blogModel.find({ tags: tag });
        console.log(validtag)
        if (validtag.length == 0) {
          return res
            .status(404)
            .send({ status: false, msg: "tag does not exist " });
        }
      }

      //filter by subcategory
      if (subcat) {
        const validsubcategory = await blogModel.find({ subcategory: subcat });
        if (validsubcategory.length == 0) {
          return res
            .status(404)
            .send({ status: false, msg: "subcategory does not exist " });
        }
      }

      //Assigning values to multiple variables
      const { authorId, category, tags, subcategory } = query;
      console.log(query)
      //filter blog and populate author
      const blog = await blogModel.find({ $and: [{ isDeleted: false }, query] }).populate('authorId');

      //if no blog found
      if (blog.length === 0) {
        return res.status(404).send({ status: false, msg: `No such blog with these filter` });
      }

      //if blog found then respond with blog
      return res.status(200).send({ status: true, data: blog });

    }

    //get blogs not deleted and published
    const blog = await blogModel.find({ $and: [{ isDeleted: false }, { isPublished: true }], }).populate('authorId');

    //If no blog found
    if (blog.length === 0) {
      return res.status(404).send({ status: false, msg: "NOT found" });
    }

    //if blog found
    res.status(200).send({ status: true, data: blog });

  } catch (error) {
    res.status(500).send({ status: false, msg: error.message });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////

const updatedModel = async function (req, res) {
  try {
    //Reading id from path param
    let id = req.params.blogId

    //validate blogId
    let validid = !/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/.test(id)
    if (validid) {
      return res.status(400).send({ status: false, msg: "enter valid blogId" })
    }

    //find blog with above id which are not deleted
    let blog = await blogModel.findOne({ $and: [{ _id: id }, { isDeleted: false }] })

    //if no blog found
    if (!blog) {
      return res.status(404).send({ status: false, msg: "blog doesnt exist" })
    }

    //if already published
    if (req.body.isPublished) {
      //Adding current time when blog published
      await blogModel.findByIdAndUpdate({ _id: id }, {publishedAt: new Date(Date.now()) , isPublished: req.body.isPublished },{new:true} )

      // blog.publishedAt = new Date(Date.now())
      // blog.isPublished = req.body.isPublished
    } else if (req.body.isPublished === false) {
      await blogModel.findByIdAndUpdate({ _id: id },{ isPublished: req.body.isPublished },{new:true} )
    }

    //Updating title
    if (req.body.title) {
      await blogModel.findByIdAndUpdate({ _id: id },{ title: req.body.title },{new:true} )
    }

    //updating body
    if (req.body.body) {
      await blogModel.findByIdAndUpdate({ _id: id },{ body: req.body.body },{new:true} )
    }

    //assing a tags in a body to tags in a blog
    if (req.body.tags) {
      await blogModel.findByIdAndUpdate({ _id: id }, { $addToSet: { tags: req.body.tags } },{new:true})
    }

    //assing a subcategory in a body to subcategory in a blog
    if (req.body.subcategory) {
      await blogModel.findByIdAndUpdate({ _id: id }, { $addToSet: { subcategory: req.body.subcategory } },{new:true})
    }

    //save changes in blog
    // blog.save()
    // respond with updated blog
    res.status(200).send({ status: true, data: blog })
  }

  catch (error) {
    res.status(500).send({ status: false, msg: error.message })
  }
}

////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////

//delete blog using blog id in path params
const deleteblog = async function (req, res) {
  try {
    //reading id
    const id = req.params.blogId


    //validate blogId
    let validid = !/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/.test(id)
    if (validid) {
      return res.status(400).send({ status: false, msg: "enter valid blogId" })
    }

    //finding blog with above id
    const blog = await blogModel.findOne({ $and: [{ _id: id }, { isDeleted: false }] })

    //if No blog found 
    if (!blog) {
      return res.status(404).send({ status: false, msg: "Blog does not exist" })
    }

    //if blog found 
    const deletedblog = await blogModel.findByIdAndUpdate({ _id: id }, { $set: { isDeleted: true, deletedAt: new Date(Date.now()) } }, { new: true })
    return res.status(200).send({ status: true, data: deletedblog })

  } catch (error) {
    res.status(500).send({ status: false, msg: error.message })
  }

}

////////////////////////////////////////////////////////////////////////////////////////////

const deletebyquery = async function (req, res) {
  try {
    //Reading query params input
    const queryparam = req.query
    //assigning values to variables
    const { category, authorId, tags, subcategory, isPublished } = queryparam//destructuring

    //authorization
    //Reading token
    let token = req.headers["x-Api-Key"];
    //check lowercase
    if (!token) token = req.headers["x-api-key"]

    let decode = jwt.verify(token, "group40-phase2");
    //Reading authorId from decoded token
    let loggedAuthorId = decode.authorId

    //find authorized blog
    const blogs = await blogModel.find({ $and: [{ authorId: loggedAuthorId }, queryparam] }).select({ title: 1, _id: 0 })

    console.log(blogs)
    //blog not found
    if (blogs.length === 0) {
      return res.status(404).send({ status: false, msg: "blog does not exist" })
    }





    //Declared empty array
    let arrayOfBlogs = []
    //for loop to store all the blog's title to delete
    for (let i = 0; i < blogs.length; i++) {
      let blogid = blogs[i].title
      arrayOfBlogs.push(blogid)
    }

    const date = new Date(Date.now())
    //delete blog and log deletion time
    const deleteblogs = await blogModel.updateMany({ title: { $in: arrayOfBlogs } },
      { $set: { deletedAt: date, isDeleted: true } },
      { new: true })

    res.status(200).send({ status: true, data: deleteblogs })

  } catch (error) {
    res.status(500).send({ status: false, msg: error.message })

  }
}

//////////////////////////////////////////////////////////////////////////////////////////

const Endpoint = function (req, res) {
  try {
    res.send({ status: false, msg: "Enter BlogId In Path to proceed further" })
  } catch (error) {
    res.status(500).send({ status: false, msg: error.message })
  }
}


//Exported all function
module.exports.createBlog = createBlog;
module.exports.getblog = getblog;
module.exports.updatedModel = updatedModel
module.exports.deleteblog = deleteblog
module.exports.deletebyquery = deletebyquery
module.exports.Endpoint = Endpoint


