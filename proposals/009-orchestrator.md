대상 파일: crew/common/CLAUDE-common.md — "쓰기" 절의 명령 항목
바꾸기 전 문장: 명령은 이름으로 부른다(git, ls, head). /usr/bin/git 처럼 절대 경로로 부르거나 앞에 export PATH=… 을 붙이지 않는다.
바꾼 뒤 문장: 명령은 이름으로 부른다(git, ls, head). 절대 경로로 부르거나 앞에 export PATH=… 을 붙이지 않는다. 다만 이름으로 부른 명령이 "command not found" 로 끝나고 PATH 에 /usr/bin 이 없으면 그 세션은 표준 자리를 잃은 것이다. 그때는 그 명령 앞에 한 줄만 잇고(export PATH="$PATH:/usr/bin:/bin:/usr/sbin:/sbin") 그 사실을 보고의 "못 확인한 것"에 적는다. crew/common/statusline.sh 13행이 같은 자리에서 이미 같은 일을 한다.
이유: orchestrator 세션이 PATH 를 "$PATH:…" 라는 글자 그대로 물려받아(앞의 $PATH 가 펼쳐지지 않은 채로) /usr/bin 과 /bin 을 잃었고, git·ls·grep 이 모두 "command not found" 로 끝났다. 지침이 우회를 금지하고 있어 커밋을 한 번도 남기지 못했고, 회차 3 의 기록·회고·제안 파일이 모두 미커밋으로 쌓였다. 금지 문장의 이유는 미리 열어 둔 승인 목록과 어긋나 사람에게 승인 요청이 올라가는 것인데, 승인 요청 한 번과 커밋이 통째로 멈추는 것 중에서는 앞쪽이 싸다. 봇의 셸 환경은 봇이 고칠 수 없는 자리이므로(남의 설정), 지침 쪽에 빠져나갈 문 하나를 두어야 한다. 같은 문제를 이미 겪은 statusline.sh 가 같은 해결을 쓰고 있다.
상태: 제안
적용 커밋: -
