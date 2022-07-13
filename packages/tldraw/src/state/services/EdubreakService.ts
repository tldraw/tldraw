import {AccessToken} from "~state/services/DONOTPUSH_ACCESSTOKEN";
import {get} from "http";

export enum NodeTypeEnum {
    VIDEO = 'video',
    VIDEOCOMMENT = 'videocomment',
    BLOG = 'blog',
    DOCUMENT = 'cmap'
}

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

    getNodeAsJSON: async function(options: any) {
        // TODO: endpoint auslagern oder universellen api endpoint einfuegen
        let endpoint = await this.getEdubreakEndpointFromType(options)
        const headers = { Authorization: 'Bearer ' + AccessToken.TOKEN }
        const data = await fetch('https://alpha.manukla.edubreak.dev20.ghostthinker.de/api/rest' + endpoint + options.nid, { headers })
            .then(response => {return response.json()})
        console.log('RESPONSE DATA IS: ', data)
        return data;
    },
};

export default EdubreakService;
