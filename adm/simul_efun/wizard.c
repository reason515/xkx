//Cracked by Kafei
// wiz.c

string wizhood(mixed ob)
{
	return SECURITY_D->get_status(ob);
}

// added by sdong, 11/18/98
int wizardp(mixed ob)
{
	object sec;
	mixed err, lvl;

	sec = find_object(SECURITY_D);
	if (!sec) {
		err = catch(sec = load_object(SECURITY_D));
		if (err || !sec) return 0;
	}
	err = catch(lvl = sec->get_wiz_level(ob));
	if (err) return 0;
	return (lvl > 0);
}

int wiz_level(mixed ob)
{
	object sec;
	mixed err, lvl;

	sec = find_object(SECURITY_D);
	if (!sec) {
		err = catch(sec = load_object(SECURITY_D));
		if (err || !sec) return 0;
	}
	err = catch(lvl = sec->get_wiz_level(ob));
	if (err) return 0;
	return lvl;
}
