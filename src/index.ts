import Elasticstore from "./elasticstore"
import * as express from "express"
import "source-map-support/register"

const app = express()

async function main() {

  // Google App Engine eventually kills our app if we don't have an HTTP server...
  // we're kind of abusing it in that regard but this should be enough to appease
  // the Google gods.
  app.get("/", (req: express.Request, res: express.Response) => {
    res.send("Hello, World")
  })

  const PORT: number = parseInt(process.env.PORT);
  app.listen(PORT || 8080, "0.0.0.0", () => {
    console.log("Started shutdown prevention server on port 80")
  })

  const elasticstore = new Elasticstore()
  elasticstore.init()
}

main()
