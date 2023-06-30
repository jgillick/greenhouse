import { GreenhouseOptions, GreenhouseOptionDefaults } from "./options";

type PersistanceObject = {
  userId?: string;
};

export class Persistance {
  options: GreenhouseOptions;

  constructor(options: GreenhouseOptions) {
    this.options = options;
  }

  /**
   * Get the storage type
   */
  get storageType() {
    return this.options.persist?.type ?? GreenhouseOptionDefaults.persist?.type;
  }

  /**
   * Get the name/key to save the persistance store under
   */
  get persistanceKey() {
    return this.options.persist?.name ?? GreenhouseOptionDefaults.persist?.name;
  }

  /**
   * Get the current persistance object
   */
  getAll(): PersistanceObject {
    let dataJson;
    let data: PersistanceObject = {};

    try {
      const storage = this.storageType;
      const name = this.persistanceKey;

      // Get data string
      if (storage === "localstorage") {
        dataJson = localStorage.getItem(name);
      } else if (storage === "cookie") {
        const cookieName = encodeURIComponent(name);
        const cookieEntry = document.cookie
          .split("; ")
          .find((row) => row.startsWith(`${cookieName}=`))
          ?.split("=")[1];
        if (cookieEntry) {
          dataJson = atob(cookieEntry.split("=")[1]);
        }
      }
    } catch (error) {
      console.warn(
        "Greenhouse: Could not retrieve persistance value from storage.",
        error
      );
    }

    // Deserialize JSON string
    if (dataJson) {
      try {
        data = JSON.parse(dataJson);
      } catch (error) {
        console.warn(
          "Greenhouse: Could not deserialize persistance value: ",
          dataJson
        );
        console.warn(error);
      }
    }

    return data;
  }

  /**
   * Save the persistance object
   */
  save(data: PersistanceObject) {
    try {
      const storage = this.storageType;
      const name = this.persistanceKey;
      const dataJson = JSON.stringify(data);

      if (storage === "localstorage") {
        localStorage.setItem(name, dataJson);
      } else if (storage === "cookie") {
        const options = this.options.persist?.cookie ?? {};

        let cookieSettings = [];
        const expiresDays =
          options.expires ?? GreenhouseOptionDefaults.persist.cookie.expires;
        if (expiresDays) {
          const expiresSeconds = 60 * 60 * 24 * expiresDays;
          cookieSettings.push(`max-age=${expiresSeconds}`);
        }
        if (options.secure) {
          cookieSettings.push("secure");
        }
        if (options.domain) {
          cookieSettings.push(`domain=${encodeURIComponent(options.domain)}`);
        }

        const cookieValue = btoa(dataJson);
        document.cookie = `${encodeURIComponent(
          name
        )}=${cookieValue};${cookieSettings.join(";")}`;
      }
    } catch (error) {
      console.warn("Greenhouse: Could not save persistance object.", error);
    }
  }

  /**
   * Clear the persistance data
   */
  clear() {
    this.save({});
  }

  /**
   * Get a persistance value
   */
  get(key: keyof PersistanceObject) {
    const data = this.getAll();
    return data[key];
  }

  /**
   * Set a persistance value
   */
  set<T extends keyof PersistanceObject>(key: T, value: PersistanceObject[T]) {
    const data = this.getAll();
    data[key] = value;
    this.save(data);
  }
}
