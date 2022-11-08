import {environment} from "../../environment";


const EdubreakService = {
  getEdubreakApiUrl() {
    const metaTag = document.head.querySelector("[itemprop~=edubreakAPIUrl][content]");
    if (metaTag) {
      // @ts-ignore
      if (metaTag['content']! !== null || metaTag['content'].length > 0) {

        // @ts-ignore
        return metaTag['content']
      }
    }
    if (environment.API_URL.length > 0) {
      return environment.API_URL
    }
    throw 'Edubreak API URL not set'
  },

  getEdubreakAccessToken() {
    const metaTag = document.head.querySelector("[itemprop~=accesstoken][content]");
    if (metaTag) {
      // @ts-ignore
      if (metaTag['content']! !== null || metaTag['content'].length > 0) {
        // @ts-ignore
        return metaTag['content']
      }
    }
    if (environment.ACCESS_TOKEN.length > 0) {
      return environment.ACCESS_TOKEN
    }
    throw 'Edubreak Access Token not set'
  },

  getBoardID: async function () {
    // Simple GET request with a JSON body using fetch
    const headers = {
      Authorization: 'Bearer ' + this.getEdubreakAccessToken()
    }
    const options = {
      method: 'GET',
      headers: headers
    };
    try {
      const data = await fetch(this.getEdubreakApiUrl() + '/svb?newBID=true', options)
        .then(response => {
          return response.json()
        })
      console.log('### EdubreakService: new BID is ###', data)
      return data;
    } catch (e) {
      console.warn('### EdubreakService: failed to get a new BID ###', e);
    }
  },

  setBoardList: async function (boards: any) {
    // Simple POST request with a JSON body using fetch
    const headers = {
      Authorization: 'Bearer ' + this.getEdubreakAccessToken()
    }
    const options = {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(boards)
    };
    try {
      await fetch(this.getEdubreakApiUrl() + '/svb?boards=true', options)
      console.log('### EdubreakService: current boards list was saved ###')
    } catch (e) {
      console.error('### EdubreakService: error while saving boards list to server ###', e);
    }
  },

  getBoardList: async function (): Promise<any> {
    // Simple GET request with a JSON body using fetch
    const headers = {
      Authorization: 'Bearer ' + this.getEdubreakAccessToken()
    }
    const options = {
      method: 'GET',
      headers: headers
    };
    try {
      const data = await fetch(this.getEdubreakApiUrl() + '/svb?boards=true', options)
        .then(response => {
          return response.json()
        })
      console.log('### EdubreakService: current boards list is ###', data)
      return data;
    } catch (e) {
      console.warn('### EdubreakService: error while getting boards list from server ###', e);
    }
  }
};

export default EdubreakService;
