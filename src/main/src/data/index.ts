import { getDataSource, getFilesOfLevel } from "./data-source"
import { User } from "./entity/User"

// const saveUser = async () => {
//     const datasource = await getDataSource();
//     const user = new User();
//     user.firstName = "Timber";
//     user.lastName = "Saw"
//     user.age = 25
//     await datasource.manager.save(user)
//     console.log("Saved a new user with id: " + user.id)

//     console.log("Loading users from the database...")
//     const users = await datasource.manager.find(User)
//     console.log("Loaded users: ", users)

//     console.log("Here you can setup and run express / fastify / any other framework.")
// };



export { getDataSource, getFilesOfLevel };
