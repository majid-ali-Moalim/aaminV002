export function AdminThemeInit() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var s=localStorage.getItem('admin-ui-store');if(!s)return;var p=JSON.parse(s);var t=p.state&&p.state.theme;if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`,
      }}
    />
  )
}
