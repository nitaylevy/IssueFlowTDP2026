import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { UserRole } from '../src/users/dto/create-user.dto';

describe('Authentication Flow (E2E)', () => {
  let app: INestApplication;
  let usersService: UsersService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Bind validation pipes to match main.ts runtime validation behavior
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    
    await app.init();

    usersService = moduleFixture.get<UsersService>(UsersService);
    
    // Seed an initial developer user for verification tests
    usersService.create({
      username: 'jdoe',
      email: 'jdoe@example.com',
      fullName: 'John Doe',
      role: UserRole.DEVELOPER,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  let jwtToken: string;

  it('POST /auth/login - should fail with invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'jdoe', password: 'wrong-password' })
      .expect(401);
  });

  it('POST /auth/login - should succeed and return a signed JWT payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'jdoe', password: 'secret' })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body.tokenType).toEqual('Bearer');
    jwtToken = response.body.accessToken; // Save token for protected routes below
  });

  it('GET /auth/me - should reject requests missing a Bearer Token', () => {
    return request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);
  });

  it('GET /auth/me - should authorize and return the correct profile data with a valid token', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(response.body.username).toEqual('jdoe');
    expect(response.body.role).toEqual(UserRole.DEVELOPER);
  });
});