import Script from 'next/script'

export function CommonRoomSignals() {
	return (
		<Script id="cr-relay-signals" strategy="afterInteractive">
			{`
  (function() {
    if (typeof window === 'undefined') return;
    if (typeof window.signals !== 'undefined') return;
    var script = document.createElement('script');
    script.src = 'https://cdn.cr-relay.com/v1/site/3c545a43-a234-4d04-a9d7-8402c4836c53/signals.js';
    script.async = true;
    window.signals = Object.assign(
      [],
      { _opts: { apiHost: 'https://api.cr-relay.com' } },
      ['page', 'identify', 'form'].reduce(function (acc, method){
        acc[method] = function () {
          signals.push([method, arguments]);
          return signals;
        };
       return acc;
      }, {})
    );
    document.head.appendChild(script);
  })();
`}
		</Script>
	)
}
