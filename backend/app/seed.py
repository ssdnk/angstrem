"""Начальные тестовые данные. Запускать: python -m app.seed (из папки backend/)"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from datetime import date
from app.database import SessionLocal, Base, engine
import app.models  # noqa
from app.models.admin import Admin
from app.models.employee import Employee
from app.models.training import Training
from app.models.enrollment import Enrollment
from app.models.test import Test
from app.models.question import Question
from app.models.answer_option import AnswerOption
from app.core.security import hash_password
from app.services.test_service import calc_deadline

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if db.query(Admin).count() > 0:
    print("База уже заполнена, пропускаем.")
    db.close()
    sys.exit(0)

# --- Admins ---
admins_data = [
    {"username": "admin", "password": "admin123", "full_name": "Администратор Системы"},
    {"username": "hr_specialist", "password": "angstrem2024", "full_name": "Специалист Отдела Развития"},
]
admins = []
for a in admins_data:
    obj = Admin(username=a["username"], password_hash=hash_password(a["password"]), full_name=a["full_name"], created_at="2024-01-01T00:00:00")
    db.add(obj)
    admins.append(obj)
db.flush()

# --- Employees ---
employees_data = [
    ("Петров",    "Сергей",    "Производственный цех №1"),
    ("Иванова",   "Мария",     "Производственный цех №1"),
    ("Сидоров",   "Алексей",   "Производственный цех №2"),
    ("Козлова",   "Елена",     "Производственный цех №2"),
    ("Новиков",   "Дмитрий",   "Отдел информационных технологий"),
    ("Морозова",  "Анна",      "Отдел информационных технологий"),
    ("Волков",    "Игорь",     "Финансово-экономический отдел"),
    ("Лебедева",  "Ольга",     "Финансово-экономический отдел"),
    ("Козлов",    "Андрей",    "Отдел снабжения"),
    ("Николаева", "Татьяна",   "Отдел снабжения"),
    ("Орлов",     "Павел",     "Производственный цех №1"),
    ("Зайцева",   "Наталья",   "Отдел охраны труда"),
    ("Соколов",   "Николай",   "Производственный цех №2"),
    ("Белова",    "Ирина",     "Отдел информационных технологий"),
    ("Кузнецов",  "Виктор",    "Отдел охраны труда"),
]
employees = []
for last, first, dept in employees_data:
    emp = Employee(last_name=last, first_name=first, department=dept, created_at="2024-01-15T00:00:00")
    db.add(emp)
    employees.append(emp)
db.flush()

# --- Trainings ---
trainings_data = [
    {
        "title": "Охрана труда и промышленная безопасность — 2024",
        "provider": "Отдел охраны труда",
        "training_type": "internal",
        "start_date": "2024-02-01",
        "end_date": "2024-02-02",
        "duration_hours": 16,
        "description": "Ежегодный инструктаж по охране труда",
    },
    {
        "title": "1С:ERP — базовый курс",
        "provider": "ООО «Инфосистемы Джет»",
        "training_type": "external",
        "start_date": "2024-03-11",
        "end_date": "2024-03-15",
        "duration_hours": 40,
        "description": "Базовый курс работы с 1С:ERP для финансового блока",
    },
    {
        "title": "Пожарно-технический минимум",
        "provider": "ООО «УЦ Пожарная безопасность»",
        "training_type": "external",
        "start_date": "2024-04-08",
        "end_date": "2024-04-09",
        "duration_hours": 16,
        "description": "Противопожарный инструктаж для сотрудников предприятия",
    },
]
trainings = []
for td in trainings_data:
    t = Training(**td, created_at="2024-01-20T00:00:00", created_by=admins[0].id)
    db.add(t)
    trainings.append(t)
db.flush()

# --- Test for training 1 ---
test1 = Test(
    training_id=trainings[0].id,
    title="Тест по охране труда и промышленной безопасности",
    time_limit_minutes=30,
    deadline_days=5,
    passing_score=70,
    is_active=1,
    created_at="2024-01-21T00:00:00",
    created_by=admins[0].id,
)
db.add(test1)
db.flush()

questions_data = [
    {
        "text": "Что необходимо сделать при обнаружении неисправности оборудования?",
        "type": "single",
        "options": [
            ("Немедленно остановить работу и сообщить мастеру", True),
            ("Продолжить работу, записав неисправность в журнал", False),
            ("Самостоятельно устранить неисправность", False),
            ("Переключиться на другое оборудование без уведомления", False),
        ],
    },
    {
        "text": "Какие средства индивидуальной защиты обязательны при работе с токарным станком?",
        "type": "multiple",
        "options": [
            ("Защитные очки", True),
            ("Противошумные наушники", True),
            ("Рабочая спецовка без свисающих элементов", True),
            ("Перчатки с длинными манжетами", False),
        ],
    },
    {
        "text": "Периодичность проведения первичного инструктажа на рабочем месте?",
        "type": "single",
        "options": [
            ("Перед началом самостоятельной работы", True),
            ("Раз в квартал", False),
            ("Раз в полгода", False),
            ("Раз в год", False),
        ],
    },
    {
        "text": "Каков порядок действий при пожаре на рабочем месте?",
        "type": "multiple",
        "options": [
            ("Сообщить в пожарную службу (101)", True),
            ("Эвакуировать людей из опасной зоны", True),
            ("Попытаться потушить огонь подручными средствами, если это безопасно", True),
            ("Продолжать работу до окончания смены", False),
        ],
    },
    {
        "text": "Какой документ регулирует охрану труда в РФ?",
        "type": "single",
        "options": [
            ("Трудовой кодекс РФ", True),
            ("Гражданский кодекс РФ", False),
            ("Налоговый кодекс РФ", False),
            ("Кодекс об административных правонарушениях", False),
        ],
    },
    {
        "text": "Что означает знак безопасности красного цвета с белой перекладиной?",
        "type": "single",
        "options": [
            ("Запрещено", True),
            ("Предупреждение", False),
            ("Обязательно к исполнению", False),
            ("Информационный знак", False),
        ],
    },
    {
        "text": "Кто несёт ответственность за безопасные условия труда на предприятии?",
        "type": "multiple",
        "options": [
            ("Работодатель", True),
            ("Руководитель подразделения", True),
            ("Сам работник в пределах своих обязанностей", True),
            ("Только государственный инспектор труда", False),
        ],
    },
    {
        "text": "При каком напряжении электрический ток считается опасным для жизни человека?",
        "type": "single",
        "options": [
            ("Свыше 42 В переменного тока", True),
            ("Свыше 220 В", False),
            ("Свыше 380 В", False),
            ("Свыше 1000 В", False),
        ],
    },
    {
        "text": "Какие действия запрещены при работе на высоте?",
        "type": "multiple",
        "options": [
            ("Работать без страховочного пояса", True),
            ("Бросать инструменты вниз", True),
            ("Работать в одиночку без страхующего", True),
            ("Использовать исправную стремянку", False),
        ],
    },
    {
        "text": "Как часто проводится повторный инструктаж по охране труда?",
        "type": "single",
        "options": [
            ("Не реже одного раза в 6 месяцев", True),
            ("Раз в год", False),
            ("Раз в 2 года", False),
            ("Только при смене должности", False),
        ],
    },
]

for idx, qd in enumerate(questions_data):
    q = Question(test_id=test1.id, question_text=qd["text"], question_type=qd["type"], order_index=idx + 1)
    db.add(q)
    db.flush()
    for oidx, (text, correct) in enumerate(qd["options"]):
        ao = AnswerOption(question_id=q.id, answer_text=text, is_correct=1 if correct else 0, order_index=oidx + 1)
        db.add(ao)

db.flush()

# --- Test for training 2 ---
test2 = Test(
    training_id=trainings[1].id,
    title="Тест: 1С:ERP базовый",
    time_limit_minutes=20,
    deadline_days=3,
    passing_score=75,
    is_active=1,
    created_at="2024-03-16T00:00:00",
    created_by=admins[1].id,
)
db.add(test2)
db.flush()

q2_data = [
    {
        "text": "Что такое 1С:ERP?",
        "type": "single",
        "options": [
            ("Система управления предприятием на платформе 1С", True),
            ("Антивирусное программное обеспечение", False),
            ("Система управления базами данных", False),
            ("Программа для бухгалтерского учёта только", False),
        ],
    },
    {
        "text": "Какие модули входят в типовую конфигурацию 1С:ERP?",
        "type": "multiple",
        "options": [
            ("Управление финансами", True),
            ("Управление производством", True),
            ("Управление персоналом", True),
            ("Управление спутниковой связью", False),
        ],
    },
    {
        "text": "Как в 1С:ERP называется документ для отражения поступления товаров?",
        "type": "single",
        "options": [
            ("Поступление товаров и услуг", True),
            ("Приходная накладная", False),
            ("Акт приёмки", False),
            ("Приходный ордер", False),
        ],
    },
    {
        "text": "Для чего служит «Рабочее место» в 1С:ERP?",
        "type": "single",
        "options": [
            ("Для быстрого доступа к часто используемым функциям конкретной роли", True),
            ("Для хранения личных данных пользователя", False),
            ("Для резервного копирования базы данных", False),
            ("Для связи с внешними системами", False),
        ],
    },
    {
        "text": "Что означает статус документа «Проведён» в 1С?",
        "type": "single",
        "options": [
            ("Документ сформировал проводки и учтён в системе", True),
            ("Документ распечатан", False),
            ("Документ отправлен контрагенту", False),
            ("Документ согласован руководителем", False),
        ],
    },
]

for idx, qd in enumerate(q2_data):
    q = Question(test_id=test2.id, question_text=qd["text"], question_type=qd["type"], order_index=idx + 1)
    db.add(q)
    db.flush()
    for oidx, (text, correct) in enumerate(qd["options"]):
        ao = AnswerOption(question_id=q.id, answer_text=text, is_correct=1 if correct else 0, order_index=oidx + 1)
        db.add(ao)

db.flush()

# --- Enrollments ---
# Training 1 — все 15 сотрудников
enrolled1 = []
for emp in employees:
    deadline = calc_deadline(date(2024, 2, 1), test1.deadline_days)
    enr = Enrollment(employee_id=emp.id, training_id=trainings[0].id, enrolled_at="2024-01-28T00:00:00", deadline_date=deadline)
    db.add(enr)
    enrolled1.append(enr)
db.flush()

# Training 2 — финансисты + ИТ
finance_it = [e for e in employees if e.department in ("Финансово-экономический отдел", "Отдел информационных технологий")]
enrolled2 = []
for emp in finance_it:
    deadline = calc_deadline(date(2024, 3, 16), test2.deadline_days)
    enr = Enrollment(employee_id=emp.id, training_id=trainings[1].id, enrolled_at="2024-03-10T00:00:00", deadline_date=deadline)
    db.add(enr)
    enrolled2.append(enr)
db.flush()

# Training 3 — цех 1 + охрана труда (без теста)
ceh1_ohr = [e for e in employees if e.department in ("Производственный цех №1", "Отдел охраны труда")]
for emp in ceh1_ohr:
    enr = Enrollment(employee_id=emp.id, training_id=trainings[2].id, enrolled_at="2024-04-05T00:00:00", deadline_date=None)
    db.add(enr)
db.flush()

# --- Simulate some attempts for training 1 ---
from app.models.test_attempt import TestAttempt
from app.models.attempt_answer import AttemptAnswer
from app.services.test_service import calc_score

# Fetch questions with options
all_questions = db.query(Question).filter(Question.test_id == test1.id).all()

# Correct answers map
correct_by_q = {q.id: [opt.id for opt in q.answer_options if opt.is_correct] for q in all_questions}

def make_attempt(enrollment, score_override=None, all_correct=False, wrong_qs=None):
    attempt = TestAttempt(
        enrollment_id=enrollment.id,
        started_at="2024-02-03T09:00:00",
        finished_at="2024-02-03T09:25:00",
        time_spent_seconds=1500,
    )
    db.add(attempt)
    db.flush()

    wrong_qs = wrong_qs or []
    for q in all_questions:
        if q.id in wrong_qs:
            # pick a wrong answer
            wrong_opts = [opt.id for opt in q.answer_options if not opt.is_correct]
            opts_to_add = [wrong_opts[0]] if wrong_opts else correct_by_q[q.id]
        else:
            opts_to_add = correct_by_q[q.id]

        for opt_id in opts_to_add:
            db.add(AttemptAnswer(attempt_id=attempt.id, question_id=q.id, answer_option_id=opt_id))

    db.flush()
    db.refresh(attempt)

    score, correct_count, total = calc_score(all_questions, attempt.answers)
    attempt.score = score
    attempt.is_passed = 1 if score >= test1.passing_score else 0
    return attempt

# 10 passed, 3 failed, 2 not taken
all_q_ids = [q.id for q in all_questions]

for i, enr in enumerate(enrolled1):
    if i < 8:
        make_attempt(enr, all_correct=True)  # все правильно
    elif i < 10:
        make_attempt(enr, wrong_qs=all_q_ids[3:])  # неправильно 7 из 10 → ~30%
    elif i < 13:
        make_attempt(enr, wrong_qs=all_q_ids[7:])  # неправильно 3 из 10 → ~70%
    # 12, 13, 14 — не проходили

# Attempts for training 2
all_questions2 = db.query(Question).filter(Question.test_id == test2.id).all()
correct_by_q2 = {q.id: [opt.id for opt in q.answer_options if opt.is_correct] for q in all_questions2}

for i, enr in enumerate(enrolled2):
    attempt = TestAttempt(
        enrollment_id=enr.id,
        started_at="2024-03-18T10:00:00",
        finished_at="2024-03-18T10:18:00",
        time_spent_seconds=1080,
    )
    db.add(attempt)
    db.flush()
    wrong_q_ids2 = [q.id for q in all_questions2]
    for q in all_questions2:
        if i < 3:
            opts = correct_by_q2[q.id]
        else:
            wrong = [opt.id for opt in q.answer_options if not opt.is_correct]
            opts = [wrong[0]] if wrong else correct_by_q2[q.id]
        for opt_id in opts:
            db.add(AttemptAnswer(attempt_id=attempt.id, question_id=q.id, answer_option_id=opt_id))
    db.flush()
    db.refresh(attempt)
    score, _, _ = calc_score(all_questions2, attempt.answers)
    attempt.score = score
    attempt.is_passed = 1 if score >= test2.passing_score else 0

db.commit()
print("Seed выполнен успешно!")
db.close()
