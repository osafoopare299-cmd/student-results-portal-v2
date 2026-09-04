export default function manifest(){
  return {
    name:'Dropare Education Portal',
    short_name:'Dropare Edu',
    description:'Dropare education system for students, lecturers and administrators.',
    start_url:'/education/student',
    scope:'/education/',
    display:'standalone',
    background_color:'#f3f8f5',
    theme_color:'#0f5b3d',
    orientation:'any',
    icons:[
      {src:'/education-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'},
      {src:'/education-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'maskable'}
    ]
  };
}
