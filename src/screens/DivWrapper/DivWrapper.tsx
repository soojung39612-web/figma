import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
  ShoppingBagIcon,
  StoreIcon,
  UserRoundIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";

const stores = [
  { id: "gangnam", label: "나이키 강남 플래그십", asset: "/vector-11.svg" },
  { id: "hongdae", label: "나이키 홍대 랩", asset: "/vector-16.svg" },
  { id: "myeongdong", label: "나이키 명동", asset: "/vector-12.svg" },
];

const dates = [
  { day: "월", date: "12", capacity: "4자리", active: true },
  { day: "화", date: "13", capacity: "8자리", active: false },
  { day: "수", date: "14", capacity: "6자리", active: true },
  { day: "목", date: "15", capacity: "11자리", active: true },
  { day: "금", date: "16", capacity: "예약마감", active: false },
];

const timeSlots = [
  { label: "10:00", available: true },
  { label: "11:00", available: true },
  { label: "14:00", available: true },
  { label: "16:00", available: true },
];

const navigationItems = [
  { label: "MYFIT", icon: HomeIcon },
  { label: "STORE", icon: StoreIcon },
  { label: "AI MATCH", icon: null },
  { label: "CART", icon: ShoppingBagIcon },
  { label: "MYPAGE", icon: UserRoundIcon },
];

export const DivWrapper = (): JSX.Element => {
  const [selectedStore, setSelectedStore] = useState("gangnam");
  const [selectedDate, setSelectedDate] = useState("13");
  const [selectedTime, setSelectedTime] = useState("14:00");

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <div
        className="relative mx-auto min-h-[874px] w-full max-w-[402px] overflow-hidden bg-[#111111] bg-[url(/vector.svg)] bg-[100%_100%] [font-family:'Noto_Sans',Helvetica]"
        aria-label="MYFIT 무료 3D 발 측정 예약"
      >
        <img
          className="pointer-events-none absolute inset-x-0 top-0 h-[7.79%] w-full"
          alt=""
          src="/vector.svg"
        />
        <header className="relative z-10 flex h-[68px] items-start gap-6 border-b border-[#343434] px-[21px] pt-[13px]">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-auto w-auto p-0 text-white hover:bg-transparent hover:text-white"
            aria-label="뒤로 가기"
          >
            <ChevronLeftIcon className="h-7 w-7 stroke-[1.8]" />
          </Button>
          <div className="flex flex-col">
            <span className="text-[19px] font-bold leading-6">MYFIT</span>
            <span className="text-[9px] leading-3 text-[#a0a0a0]">
              PRECISION LAB
            </span>
          </div>
        </header>
        <img
          className="pointer-events-none absolute inset-x-0 top-[7.73%] h-px w-full"
          alt=""
          src="/vector-17.svg"
        />
        <section className="relative z-10 px-[21px] pb-5 pt-[25px]">
          <p className="mb-2 text-[11px] font-bold text-[#c5f400]">
            STORE FITTING · 예약
          </p>
          <h1 className="text-[27px] font-bold leading-9 tracking-[-1px]">
            무료 3D 발 측정 예약
          </h1>
          <p className="mt-0.5 text-xs text-[#a9a9a9]">
            발 측정 매장과 날짜·시간을 선택하세요.
          </p>
        </section>
        <Card className="relative mx-4 overflow-hidden rounded-[23px] border-0 bg-[#1d1d1d] shadow-none">
          <img
            className="pointer-events-none absolute inset-0 h-full w-full object-fill opacity-0"
            alt=""
            src="/vector-2.svg"
          />
          <CardContent className="relative z-10 p-[17px]">
            <section aria-labelledby="store-heading">
              <h2
                id="store-heading"
                className="mb-5 ml-1 text-[11px] font-bold text-[#c5f400]"
              >
                예약 가능 매장
              </h2>
              <Tabs
                value={selectedStore}
                onValueChange={setSelectedStore}
                className="w-full"
              >
                <TabsList className="grid h-[39px] w-full grid-cols-[1.35fr_1fr_1fr] gap-2 bg-transparent p-0">
                  {stores.map((store) => (
                    <TabsTrigger
                      key={store.id}
                      value={store.id}
                      className="relative h-[39px] overflow-hidden rounded-full border-0 bg-[#303030] px-2 text-[11px] font-bold text-[#8d8d8d] shadow-none data-[state=active]:bg-white data-[state=active]:text-[#171717]"
                    >
                      <img
                        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
                        alt=""
                        src={store.asset}
                      />
                      <span className="relative z-10 whitespace-nowrap">
                        {store.label}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </section>
            <section aria-labelledby="date-heading" className="mt-5">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 id="date-heading" className="text-sm font-bold">
                  2027년 4월
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-auto w-auto p-0 text-[#c5f400] hover:bg-transparent hover:text-[#c5f400]"
                  aria-label="다음 달"
                >
                  <ChevronRightIcon className="h-5 w-5 stroke-[3]" />
                </Button>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {dates.map((item) => {
                  const isSelected = selectedDate === item.date;

                  return (
                    <Button
                      key={item.date}
                      type="button"
                      onClick={() => item.active && setSelectedDate(item.date)}
                      disabled={!item.active}
                      className={`relative flex h-[114px] flex-col items-center justify-start rounded-none border-0 px-0 py-2 text-center shadow-none ${
                        isSelected
                          ? "bg-[#c5f400] text-[#151515] hover:bg-[#c5f400]"
                          : "bg-[#303030] text-white hover:bg-[#3a3a3a]"
                      } disabled:cursor-not-allowed disabled:opacity-100`}
                    >
                      <span
                        className={`text-[13px] font-normal ${
                          isSelected ? "text-[#151515]" : "text-[#a4a4a4]"
                        }`}
                      >
                        {item.day}
                      </span>
                      <span className="mt-1 text-2xl font-bold leading-8">
                        {item.date}
                      </span>
                      <span
                        className={`mt-auto text-[10px] font-bold ${
                          item.active
                            ? isSelected
                              ? "text-[#172000]"
                              : "text-[#c5f400]"
                            : "text-[#888888]"
                        }`}
                      >
                        {item.capacity}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </section>
            <section aria-labelledby="time-heading" className="mt-4">
              <h2 id="time-heading" className="mb-3 text-sm font-bold">
                예약 시간 선택
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map((slot) => {
                  const isSelected = selectedTime === slot.label;

                  return (
                    <Button
                      key={slot.label}
                      type="button"
                      onClick={() => setSelectedTime(slot.label)}
                      disabled={!slot.available}
                      className={`h-[46px] rounded-xl border px-0 text-base font-bold shadow-none ${
                        isSelected
                          ? "border-[#c5f400] bg-[#c5f400] text-[#151515] hover:bg-[#c5f400]"
                          : "border-[#4b4b4b] bg-[#303030] text-[#efefef] hover:bg-[#3a3a3a]"
                      }`}
                    >
                      {slot.label}
                    </Button>
                  );
                })}
              </div>
            </section>
            <Button
              type="button"
              className="mt-6 h-[51px] w-full rounded-full bg-[#c5f400] text-[13px] font-bold text-[#151515] shadow-none hover:bg-[#c5f400]"
            >
              강남점 · 4월 13일 14:00 예약하기
            </Button>
          </CardContent>
        </Card>
        <Card className="relative mx-4 mt-5 rounded-[19px] border-0 bg-[#1d1d1d] shadow-none">
          <img
            className="pointer-events-none absolute inset-0 h-full w-full object-fill opacity-0"
            alt=""
            src="/vector-3.svg"
          />
          <CardContent className="relative z-10 px-[17px] py-[14px]">
            <h2 className="text-sm font-bold">예약 안내</h2>
            <p className="mt-2 text-xs text-[#b2b2b2]">
              발 측정 약 15분 · 무료 / 시범 운영 일정
            </p>
            <p className="mt-1 text-[11px] text-[#b2b2b2]">
              회원 데이터 저장은 별도 동의 후 진행
            </p>
          </CardContent>
        </Card>
        <footer className="absolute inset-x-0 bottom-0 border-t border-[#343434] bg-[#111111] px-5 pb-2 pt-2">
          <nav aria-label="주요 메뉴">
            <ul className="grid grid-cols-5">
              {navigationItems.map((item) => {
                const Icon = item.icon;

                return (
                  <li key={item.label}>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex h-auto w-full flex-col gap-1 p-0 text-[#dddddd] hover:bg-transparent hover:text-white"
                    >
                      {Icon ? (
                        <Icon className="h-[19px] w-[19px] stroke-[1.8]" />
                      ) : (
                        <span className="flex h-[19px] items-center text-lg font-bold leading-none">
                          ⌁
                        </span>
                      )}
                      <span className="text-[9px] font-bold text-[#b6b6b6]">
                        {item.label}
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </footer>
        <img
          className="pointer-events-none absolute bottom-[6.2%] left-[69.23%] h-[2.33%] w-[4.1%] opacity-0"
          alt=""
          src="/container.svg"
        />
      </div>
    </main>
  );
};
