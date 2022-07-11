export enum NodeTypeEnum {
    VIDEO = 'video',
    VIDEOCOMMENT = 'videocomment',
    BLOG = 'blog',
    DOCUMENT = 'document'
}

const EdubreakService = {
    getEdubreakEndpointFromType: async function(options: any) {
        switch (options.type) {
            case NodeTypeEnum.VIDEO: return '/videos/';
            case NodeTypeEnum.VIDEOCOMMENT: return '/content/videocomment/';
            case NodeTypeEnum.BLOG: return '/content/blog/';
            case NodeTypeEnum.DOCUMENT: return '/content/document/';
            default: return '';
        }
    },

    getNodeAsJSON: async function(options: any) {
        // TODO: endpoint auslagern oder universellen api endpoint einfuegen
        // fetch('https://codeception.manukla.edubreak.dev20.ghostthinker.de/api/rest')
        let endpoint = await this.getEdubreakEndpointFromType(options)
        fetch('https://ghostthinker.edubreak.de/api/rest' + endpoint + options.nid)
            .then(async response => {
                const data = await response.json();
                console.log('response from request: ', data);
                // check for error response
                if (!response.ok) {
                    // get error message from body or default to response statusText
                    const error = (data && data.message) || response.statusText;
                    return Promise.reject(error);
                }
                return Promise.resolve()
            })
            .catch(error => {
                console.error('There was an error!', error);
            });
    },
};

export default EdubreakService;
