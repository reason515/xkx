//Cracked by Roath
// more.c

#include <ansi.h>

void more(string cmd, string *text, int line)
{
	int i,j;

	switch(cmd) {
		case "":
		case "n":
			for(i=line + 23; line<sizeof(text) && line<i; line++)
				write(text[line] + "\n");
			if( line>=sizeof(text) ) return;
			break;
	case "b":
	line = line - 46;
	if(line<-22) return;
	for(i=line + 23; line < i;line++)
		write(text[line]+"\n");
	break;
		case "q":
			return;
	}
	printf("== 未完继续 " HIY "%d%%" NOR " == (n 或 <ENTER> 继续下一页，q 离开，b 前一页)",
		(line*100/sizeof(text)) );
	input_to("more", text, line);
}

void start_more(string msg)
{
	object me;

	/* Web 无命令行，input_to 分页会卡死；整篇写出，由前端面板滚动阅读。 */
	me = this_object();
	if (objectp(me) && me->query_temp("web_client")) {
		if (!stringp(msg)) msg = "";
		write(msg);
		if (sizeof(msg) < 1 || msg[sizeof(msg) - 1] != '\n')
			write("\n");
		return;
	}
	more("", explode(msg, "\n"), 0);
}
