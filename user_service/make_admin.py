import asyncio
from sqlalchemy import update
from src.database import async_session_maker
from src.models.user import User

async def make_admin(email:str):
  async with async_session_maker() as session:
    stmt = update(User).where(User.email == email).values(is_superuser=True)
    await session.execute(stmt)
    await session.commit()
    print(f"Пользователь {email} успешно получил права администратора!")
asyncio.run(make_admin("joy.dramer@icloud.com"))