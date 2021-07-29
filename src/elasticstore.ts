import Config from "./config"
import { SecretManagerServiceClient } from "@google-cloud/secret-manager"
import * as elasticsearch from "@elastic/elasticsearch"
import * as colors from "colors"
import * as admin from "firebase-admin"
import Worker from "./util/Worker"

const secrets = new SecretManagerServiceClient()

export default class Elasticstore {
  private esClient: elasticsearch.Client
  private retryTimer: NodeJS.Timer
  private retryInterval: number = 5000

  init = async () => {
    await this.initElasticsearch()
    this.initFirebase()
    this.initWorker()
  }

  initElasticsearch = async () => {
    // Load password from Google Secret Manager
    console.log(colors.grey("Grabbing secrets from Google..."))
    const [version] = await secrets.accessSecretVersion({
      name: "projects/790992099741/secrets/elastic_secret/versions/1",
    })

    return new Promise((resolve, reject) => {
      this.esClient = new elasticsearch.Client({
        cloud: {
          id: Config.ES_CLOUD_ID,
        },
        auth: {
          username: Config.ES_USER,
          password: version.payload.data.toString(),
        },
        requestTimeout: Config.ES_OPTS.requestTimeout,
      })

      console.log(colors.grey("Connecting to ElasticSearch host %s:%s"), Config.ES_HOST, Config.ES_PORT)
      let retries = 0
      this.retryTimer = setInterval(async () => {
        try {
          await this.ping()
          console.log(colors.green("Connected to ElasticSearch host %s:%s"), Config.ES_HOST, Config.ES_PORT)
          clearInterval(this.retryTimer)
          resolve()
        } catch (e) {
          console.log(colors.red("Failed to connect to ElasticSearch host %s:%s"), Config.ES_HOST, Config.ES_PORT)
          console.log(colors.yellow("Retrying in %sms"), this.retryInterval)
          retries++
        }
      }, this.retryInterval)
    })
  }

  ping = () => {
    return new Promise((resolve, reject) => {
      this.esClient.ping((err, result) => {
        if (err) return reject(err)
        else return resolve(result)
      })
    })
  }

  initFirebase = () => {
    console.log(colors.grey("Connecting to Firebase %s"), Config.FB_PROJECT_ID)
    try {
      // Initialize firebase
      admin.initializeApp()
    } catch (e) {
      console.log(colors.red(e.message))
    }
    console.log(colors.green("Initialized Firebase App!"))
  }

  initWorker = () => Worker.register(this.esClient)
}
