const TLDRAW_BRANDING_MESSAGE = `

          ↑↑↑                          ↑↑↑↑↑      
         ↑↑ ↑↑    ↑↑↑                       ↑     
         ↑↑ ↑↑   ↑↑ ↑                      ↑↑     
          ↑↘↑   ↑↑  ↑                     ↘↑      
          ←↑    ↑↑  ↑            ↑↑      ↑↑       
        ↘↑↑↑↑   ↑↑ ↑  ↑↑↑↑  ↑↑   ↑↑↑   ↘↑         
     ↑↑↑    ↑   ↑↑↑  →↑  ↑  ↑↑   ↑ ↑↑ ↑→          
            ↑↑  ↑↑   ↑↑  ↑  ↑↑  ↑↑  ↓↑            
             ↑↑↑ ↑    ↑ ↑  ↑↑↑↑↑↑  ↑↑ ↑           
          ↑↑ ↑→  ↑↑    ↑↑↑↑       ↑↖   ↑          
        ↑↑   ↑↑    ↑↑↑↑          ↑↑     ↑         
       ↑↑    ↑↑                  ↑      ↑         
       ↑     ↑↑                  ↑      ↑         
       ↑↑   ↑↑                   ↑↑    ↑          
         ↑↑↑                      ↑↑↑↑↑           

                                                  
	Build with tldraw at https://tldraw.dev
             
Work with tldraw at https://tldraw.dev/careers	

`

export function showConsoleBranding() {
	// eslint-disable-next-line no-console
	console.log('%c' + TLDRAW_BRANDING_MESSAGE, 'font-family: monospace; font-weight: normal;')
}
