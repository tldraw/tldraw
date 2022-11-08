import {environment} from "~environment";

export enum NodeTypeEnum {
    VIDEO = 'video',
    VIDEOCOMMENT = 'videocomment',
    BLOG = 'blog',
    DOCUMENT = 'cmap'
}
let domain = '';
let path = '';
const EdubreakService = {

    getEdubreakEndpointFromType: async function(options: any) {
        switch (options.type) {
            case NodeTypeEnum.VIDEO: return '/videos/';
            case NodeTypeEnum.VIDEOCOMMENT: return '/content/';
            case NodeTypeEnum.BLOG: return '/content/';
            case NodeTypeEnum.DOCUMENT: return '/content/';
            default: return '';
        }
    },

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

    getNodeAsJSON: async function(options: any) {
        let endpoint = await this.getEdubreakEndpointFromType(options)
        const headers = { Authorization: 'Bearer ' + this.getEdubreakAccessToken() }
        const data = await fetch( this.getEdubreakApiUrl() + endpoint + options.nid, { headers })
            .then(response => {return response.json()})
        return data;
    },

    textIsEdubreakLink: function(text: string) {
        if (text.length < 1) {return false;}
        try { // check if the pasted text is an edubreak link and set domain and path accordingly
            const options = this.parseEdubreakLink(text);
            if (options === null) { return false;}
            domain = options.domain;
            path = options.path;

            return domain.includes('.edubreak.') && this.getNodeType(path) !== null;
        } catch (e) {
            console.error(e)
            return false;
        }
    },

    getNodeType: function(path: string) {
        // checks if there is a node type in our pasted edubreak link
        const types = [
            NodeTypeEnum.VIDEO,
            NodeTypeEnum.VIDEOCOMMENT,
            NodeTypeEnum.BLOG,
            NodeTypeEnum.DOCUMENT
        ]

        for (const type of types) {
            const pathType = '/' + type + '/'
            if (path.includes(pathType)) {
                return type;
            }
        }
        return null;
    },

    getEdubreakIds: function(edubreakPath: string) {
        // gets nid and og_id from pasted node edubreak link
        const regexp = /[\w.,@?^=%&:\/~+#-]*course-([0-9]*)[\w@?^=%&\/~+#-]*\/([0-9]+)/g;
        const regMatches = edubreakPath.matchAll(regexp);
        const matches = [];
        for (const regMatch of regMatches) {
            matches.push(regMatch)
        }
        return matches;
    },


    parseEdubreakLink: function(text: string) {
        const regexp = /(http|ftp|https)?:?\/?\/?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/g;
        const regMatches = text.matchAll(regexp);
        const matches = [];
        for (const regMatch of regMatches) {
            matches.push(regMatch)
        }
        if (matches.length < 1 || matches[0].length < 4) {return null;}

        domain = matches[0][2];
        path = matches[0][3];

        let edubreakIds = EdubreakService.getEdubreakIds(path)
        return {
            domain: domain,
            path: path,
            type: this.getNodeType(path),
            og_id: edubreakIds[0][1],
            nid: edubreakIds[0][2]
        }
    },

    saveStateToEdubreak: async function(state: any) {
        // Simple POST request with a JSON body using fetch
        const headers = {
            Authorization: 'Bearer ' + this.getEdubreakAccessToken()
        }
        // get the board's ID from the url
        const boardId = this.getBoardIDfromURL();
        const options = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(state)
        };
        try {
            await fetch(this.getEdubreakApiUrl() + '/svb?bid=' + boardId, options)
            console.log('### EdubreakService: current document state was saved ###')
        } catch (e) {
            console.error('### EdubreakService: error while persisting document state to the server ###', e);
        }
    },

    getStateFromEdubreak: async function() {
        // Simple GET request with a JSON body using fetch
        const headers = {
            Authorization: 'Bearer ' + this.getEdubreakAccessToken()
        }
        // get the board's ID from the url
        const boardId = this.getBoardIDfromURL();
        const options = {
            method: 'GET',
            headers: headers
        };
        try {
            const data = await fetch(this.getEdubreakApiUrl() + '/svb?bid=' + boardId, options)
              .then(response => {
                  return response.json()
              })
            console.log('### EdubreakService: current document state is ###', data)
            return data;
        } catch (e) {
            console.warn('### EdubreakService: there is no server data for this board ###', e);
        }
    },

    getBoardIDfromURL: function() {
        const url = window.location.href;
        const idRegex = /\/([0-9]{6})/;
        // @ts-ignore
        return url.match(idRegex)[1];
    },
};

export default EdubreakService;
